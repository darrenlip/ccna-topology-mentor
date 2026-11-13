import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Terminal,
  Award,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Network,
  BookOpen,
  Play,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Compass,
  Lock,
  Unlock,
  AlertCircle,
  Info,
  Check,
  Download,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { ArchitectureReport } from '../types/network';
import {
  SkillDomain,
  ChallengeMode,
  CcnaChallenge,
  Achievement,
  ArenaProgressV2,
  CORE_CHALLENGES,
  CORE_MISSION_IDS,
  DOMAIN_META,
  computeRankInfo,
  computeCategoryMastery,
  evaluateAchievements,
  getRecommendedMission,
  loadAndMigrateProgress,
  saveProgressSafely,
  normalizeCliCommand,
  DEFAULT_PROGRESS_V2,
  generateOptionPermutation,
  LearnerReflection,
  DEFAULT_REFLECTION,
  loadLearnerReflection,
  saveLearnerReflection,
  computeEvidenceSummary,
  buildEvidenceExport,
  buildEvidenceMarkdown,
} from '../utils/arenaGamification';

export interface CcnaTrainingArenaProps {
  report: ArchitectureReport | null;
  onJumpToStage?: (
    stage: 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'visualizer'
  ) => void;
}

export const CcnaTrainingArena: React.FC<CcnaTrainingArenaProps> = ({
  report,
  onJumpToStage,
}) => {
  // Safe versioned progress state
  const [progress, setProgress] = useState<ArenaProgressV2>(() => loadAndMigrateProgress());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'missions' | 'achievements' | 'mastery' | 'evidence'>('missions');
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'LIVE' | SkillDomain>('ALL');

  // Accessible live announcement message
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Prefers reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Save progress safely on change
  useEffect(() => {
    saveProgressSafely(progress);
  }, [progress]);

  // Dynamically generate topology-specific challenges when an ArchitectureReport is loaded
  const liveTopologyChallenges = useMemo<CcnaChallenge[]>(() => {
    if (!report) return [];
    const generated: CcnaChallenge[] = [];
    const addressing = report.stage2_addressing?.addressingTable || [];
    const routers = report.stage1_topology?.routers || [];
    const switches = report.stage1_topology?.switches || [];
    const connections = report.stage1_topology?.connections || [];

    // 1. Live Router Interface IP Configuration Drill
    const firstRouterEntry = addressing.find(
      (a) =>
        a.ipAddress &&
        a.ipAddress !== 'N/A' &&
        a.ipAddress !== 'unassigned' &&
        !a.device.toLowerCase().startsWith('pc') &&
        !a.interface.toLowerCase().includes('vlan')
    );

    if (firstRouterEntry) {
      const ip = firstRouterEntry.ipAddress.split('/')[0].trim();
      const mask = firstRouterEntry.subnetMask || '255.255.255.0';
      generated.push({
        id: `live-ip-${firstRouterEntry.device}-${firstRouterEntry.interface}`,
        title: `Live Topology Drill: Configure ${firstRouterEntry.device} ${firstRouterEntry.interface}`,
        domain: 'IOS_INTERFACE_CLI',
        mode: 'CLI_DRILL',
        difficulty: 'Foundation',
        xpReward: 150,
        isLiveTopology: true,
        scenario: `In your active topology ("${report.title}"), device ${firstRouterEntry.device} uses interface ${firstRouterEntry.interface} (${firstRouterEntry.vlanPurpose || 'LAN/WAN Segment'}) with IP ${ip} and mask ${mask}.`,
        learningObjective: `Configure the verified IPv4 address and subnet mask on ${firstRouterEntry.device} interface ${firstRouterEntry.interface} according to the analyzed network topology.`,
        taskPrompt: `Enter or assemble the exact IOS command on ${firstRouterEntry.device}(config-if)# to assign ${ip} with mask ${mask}.`,
        iosPrompt: `${firstRouterEntry.device}(config-if)#`,
        acceptedCommands: [
          `ip address ${ip} ${mask}`,
          `ip add ${ip} ${mask}`,
          `ip addr ${ip} ${mask}`,
        ],
        tokenPool: ['ip', 'address', ip, mask, 'no', 'shutdown', '0.0.0.255'],
        hint: `Use "ip address ${ip} ${mask}" inside interface configuration mode. Hints never deduct XP.`,
        mentorExplanation: `This matches Stage 2 & Stage 3 of your uploaded topology: ${firstRouterEntry.device} interface ${firstRouterEntry.interface} is assigned ${ip}/${firstRouterEntry.prefix || 24} (${mask}).`,
        ccnaReference: 'Active Topology · Stage 2 & Stage 3 Alignment',
      });
    }

    // 2. Live Topology Default Gateway / Endpoint Verification Challenge
    const endpointEntry = addressing.find(
      (a) =>
        (a.device.toLowerCase().includes('pc') ||
          a.device.toLowerCase().includes('srv') ||
          a.device.toLowerCase().includes('host')) &&
        a.defaultGateway &&
        a.defaultGateway !== 'N/A'
    );

    if (endpointEntry) {
      const correctGw = endpointEntry.defaultGateway.trim();
      const ipOctets = correctGw.split('.');
      const prefix3 =
        ipOctets.length === 4 ? `${ipOctets[0]}.${ipOctets[1]}.${ipOctets[2]}` : '192.168.0';
      const wrong1 = `${prefix3}.0`;
      const wrong2 = `${prefix3}.255`;
      const wrong3 = endpointEntry.ipAddress.split('/')[0].trim();

      const rawOptions = [
        `${correctGw} — the router interface IP on the same local subnet`,
        `${wrong1} — the subnet network identifier`,
        `${wrong2} — the subnet directed broadcast address`,
        `${wrong3} — the endpoint's own NIC loopback address`,
      ];

      generated.push({
        id: `live-gw-${endpointEntry.device}`,
        title: `Live Topology Check: Default Gateway for ${endpointEntry.device}`,
        domain: 'VLSM_ADDRESSING',
        mode: 'ARCHITECT_DECISION',
        difficulty: 'Foundation',
        xpReward: 140,
        isLiveTopology: true,
        scenario: `In your uploaded topology, endpoint ${endpointEntry.device} is assigned IP ${endpointEntry.ipAddress} (${endpointEntry.subnetMask}). It needs to send packets to another subnet.`,
        learningObjective: `Identify and configure the correct Default Gateway IPv4 address for ${endpointEntry.device} so host packets can leave the local subnet.`,
        taskPrompt: `Which Default Gateway IP must be configured on ${endpointEntry.device} so traffic can leave its local subnet?`,
        options: rawOptions,
        correctOptionIndex: 0,
        hint: `Check Stage 2 Addressing Table for the router interface residing in the same subnet as ${endpointEntry.device}.`,
        mentorExplanation: `An endpoint's Default Gateway must always be the usable IPv4 address of the local router interface (or L3 switch SVI) on the same subnet (${correctGw}). Network IDs (${wrong1}) and broadcast addresses (${wrong2}) can never be assigned to interfaces.`,
        ccnaReference: 'Active Topology · Stage 2 Default Gateway Rules',
      });
    }

    // 3. Live Topology Routing Architecture Challenge
    if (routers.length > 0) {
      const isSingleRouter = routers.length === 1 && switches.length === 0;
      const protocol = report.constraints?.routingProtocol || 'STATIC';
      generated.push({
        id: `live-routing-${report.id}`,
        title: `Live Topology Architecture: ${routers.length}-Router Routing Strategy`,
        domain: 'ROUTING_ARCHITECTURE',
        mode: 'ARCHITECT_DECISION',
        difficulty: 'Intermediate',
        xpReward: 160,
        isLiveTopology: true,
        scenario: `Your analyzed topology contains ${routers.length} router(s) (${routers.map((r) => r.name).join(', ')}) and ${switches.length} switch(es), with ${connections.length} physical link(s).`,
        learningObjective: `Analyze routing table population and distinguish directly connected routes from static and OSPF routes in the active topology.`,
        taskPrompt: isSingleRouter
          ? `Why does ${routers[0].name} forward packets between its interfaces without needing OSPF or static routes?`
          : `When verifying Layer 3 reachability across ${routers.map((r) => r.name).join(' and ')}, what does the code "C" vs "S" or "O" indicate in "show ip route"?`,
        options: isSingleRouter
          ? [
              `All subnets are directly attached to ${routers[0].name}, so IOS automatically populates Connected ("C") routes with Administrative Distance 0.`,
              `${routers[0].name} runs Spanning Tree Protocol (STP) to route Layer 3 packets.`,
              `${routers[0].name} uses ARP proxy to bridge different subnets without a routing table.`,
              `Cisco routers enable BGP by default on all LAN interfaces.`,
            ]
          : [
              `"C" indicates a Directly Connected interface subnet (AD 0), "S" indicates an admin-configured Static route (AD 1), and "O" indicates a dynamic OSPF route (AD 110).`,
              `"C" means Cisco proprietary, "S" means Switch trunk, and "O" means Offline interface.`,
              `"C" has Administrative Distance 255, while "O" has Administrative Distance 0.`,
              `All three codes represent Layer 2 MAC address table entries.`,
            ],
        correctOptionIndex: 0,
        hint: `Remember Cisco Administrative Distance (AD): Connected = 0, Static = 1, OSPF = 110 (Configured mode: ${protocol}).`,
        mentorExplanation: isSingleRouter
          ? `Because ${routers[0].name} connects directly to each subnet, activating its interfaces with "ip address" and "no shutdown" automatically injects Connected (C) and Local (L) entries into the routing table.`
          : `In a multi-router topology, each router automatically knows its own Directly Connected (C) links, and uses Static (S) or OSPF (O) routes to learn remote subnets attached to neighboring routers.`,
        ccnaReference: 'Active Topology · Stage 4 Routing Decision Matrix',
      });
    }

    return generated;
  }, [report]);

  const allChallenges = useMemo<CcnaChallenge[]>(
    () => [...liveTopologyChallenges, ...CORE_CHALLENGES],
    [liveTopologyChallenges]
  );

  // Recommended next mission computation
  const recommendedMission = useMemo<CcnaChallenge>(
    () => getRecommendedMission(allChallenges, progress.completedIds, progress.domainScores),
    [allChallenges, progress.completedIds, progress.domainScores]
  );

  const [activeChallengeId, setActiveChallengeId] = useState<string>(
    () => allChallenges[0]?.id || CORE_CHALLENGES[0].id
  );
  const [cliInput, setCliInput] = useState('');
  const [selectedDisplayIndex, setSelectedDisplayIndex] = useState<number | null>(null);
  const [optionPermutation, setOptionPermutation] = useState<number[]>(() =>
    generateOptionPermutation(CORE_CHALLENGES[0]?.options?.length || 0)
  );
  const [showHint, setShowHint] = useState(false);
  const [hintRevealedThisAttempt, setHintRevealedThisAttempt] = useState(false);
  const [submissionState, setSubmissionState] = useState<'IDLE' | 'CORRECT' | 'INCORRECT'>('IDLE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEarnedXp, setLastEarnedXp] = useState<number>(0);
  const [lastWasReplay, setLastWasReplay] = useState<boolean>(false);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<Achievement[]>([]);

  // Reflection & Evidence state
  const [reflection, setReflection] = useState<LearnerReflection>(() => loadLearnerReflection());
  const [reflectionSavedToast, setReflectionSavedToast] = useState(false);

  // Reference for scrolling to workbench smoothly
  const workbenchRef = useRef<HTMLDivElement>(null);

  // Switch to the first live challenge automatically when a new report is loaded
  useEffect(() => {
    if (liveTopologyChallenges.length > 0) {
      setSelectedFilter('LIVE');
      setActiveChallengeId(liveTopologyChallenges[0].id);
      setCliInput('');
      setSelectedDisplayIndex(null);
      setOptionPermutation(generateOptionPermutation(liveTopologyChallenges[0].options?.length || 0));
      setSubmissionState('IDLE');
      setShowHint(false);
      setHintRevealedThisAttempt(false);
      setNewlyUnlockedBadges([]);
    }
  }, [report?.id, liveTopologyChallenges]);

  const filteredChallenges = useMemo(() => {
    if (selectedFilter === 'ALL') return allChallenges;
    if (selectedFilter === 'LIVE') {
      return liveTopologyChallenges.length > 0 ? liveTopologyChallenges : allChallenges;
    }
    return allChallenges.filter((c) => c.domain === selectedFilter);
  }, [allChallenges, liveTopologyChallenges, selectedFilter]);

  const activeChallenge = useMemo(
    () =>
      allChallenges.find((c) => c.id === activeChallengeId) ||
      filteredChallenges[0] ||
      CORE_CHALLENGES[0],
    [allChallenges, filteredChallenges, activeChallengeId]
  );

  // Real distinct current-catalog completions (prevents old topology IDs from causing e.g. 12/8)
  const activeCompletedCount = useMemo(() => {
    const currentChallengeIds = new Set(allChallenges.map((c) => c.id));
    return progress.completedIds.filter((id) => currentChallengeIds.has(id)).length;
  }, [allChallenges, progress.completedIds]);

  const coreCompletedCount = useMemo(() => {
    return CORE_MISSION_IDS.filter((id) => progress.completedIds.includes(id)).length;
  }, [progress.completedIds]);

  // Derived rank, mastery, achievements, and evidence summary
  const rankInfo = useMemo(() => computeRankInfo(progress.xp), [progress.xp]);
  const categoryMastery = useMemo(
    () => computeCategoryMastery(allChallenges, progress.completedIds),
    [allChallenges, progress.completedIds]
  );
  const achievements = useMemo(
    () => evaluateAchievements(progress, allChallenges),
    [progress, allChallenges]
  );
  const evidenceSummary = useMemo(
    () => computeEvidenceSummary(progress, allChallenges),
    [progress, allChallenges]
  );

  // Session Goal calculations
  const sessionCompletedCount = progress.sessionCompletedIds.length;
  const sessionGoalTarget = progress.sessionGoal;
  const isSessionGoalAchieved = sessionCompletedCount >= sessionGoalTarget;

  const selectChallenge = (id: string, shouldScroll = false) => {
    setActiveTab('missions');
    setActiveChallengeId(id);
    setCliInput('');
    setSelectedDisplayIndex(null);
    setSubmissionState('IDLE');
    setShowHint(false);
    setHintRevealedThisAttempt(false);
    setNewlyUnlockedBadges([]);
    const target =
      allChallenges.find((c) => c.id === id) || filteredChallenges[0] || CORE_CHALLENGES[0];
    setOptionPermutation(generateOptionPermutation(target.options?.length || 0));
    if (shouldScroll) {
      setTimeout(() => {
        const el = document.getElementById('mission-workbench');
        if (el) {
          el.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
          const input = el.querySelector('input') as HTMLInputElement | null;
          if (input) {
            input.focus();
          } else {
            el.focus();
          }
        } else if (workbenchRef.current) {
          workbenchRef.current.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
        }
      }, 50);
    }
  };

  const handlePracticeAgain = () => {
    setSubmissionState('IDLE');
    setNewlyUnlockedBadges([]);
    setCliInput('');
    setSelectedDisplayIndex(null);
    setShowHint(false);
    setHintRevealedThisAttempt(false);
    setOptionPermutation(generateOptionPermutation(activeChallenge.options?.length || 0));
    setLiveAnnouncement('Practice mode activated. Enter command or choice to practice again.');
    setTimeout(() => {
      const el = document.getElementById('mission-workbench');
      if (el) {
        const inputEl = el.querySelector('input') as HTMLInputElement | null;
        if (inputEl) inputEl.focus();
      }
    }, 50);
  };

  const handleToggleHint = () => {
    if (!showHint) {
      setShowHint(true);
      setHintRevealedThisAttempt(true); // Recorded once per deliberate attempt
    } else {
      setShowHint(false);
    }
  };

  const handleAppendToken = (token: string) => {
    if (submissionState === 'CORRECT') return;
    setSubmissionState('IDLE');
    setCliInput((prev) => (prev.trim() ? `${prev.trim()} ${token}` : token));
  };

  const handleSaveReflection = () => {
    saveLearnerReflection(reflection);
    setReflectionSavedToast(true);
    setLiveAnnouncement('Reflection and feedback saved locally to this device.');
    setTimeout(() => setReflectionSavedToast(false), 3000);
  };

  const handleExportTextEvidence = () => {
    const data = buildEvidenceExport(progress, allChallenges, reflection);
    const md = buildEvidenceMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCNA-Skill-Arena-Evidence-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonEvidence = () => {
    const data = buildEvidenceExport(progress, allChallenges, reflection);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCNA-Skill-Arena-Evidence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifyAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Guard against duplicate unchanged submissions or double clicks when already verified
    if (!activeChallenge || isSubmitting || submissionState === 'CORRECT') return;

    // Reject empty submissions without incrementing attempts
    if (activeChallenge.mode === 'CLI_DRILL') {
      if (!cliInput.trim()) return;
    } else {
      if (selectedDisplayIndex === null || selectedDisplayIndex === undefined) return;
    }

    setIsSubmitting(true);
    let isCorrect = false;

    if (activeChallenge.mode === 'CLI_DRILL') {
      const normalizedUser = normalizeCliCommand(cliInput);
      isCorrect = (activeChallenge.acceptedCommands || []).some(
        (cmd) => normalizeCliCommand(cmd) === normalizedUser
      );
    } else {
      const chosenOrig =
        selectedDisplayIndex !== null
          ? optionPermutation[selectedDisplayIndex] ?? selectedDisplayIndex
          : -1;
      isCorrect = chosenOrig === activeChallenge.correctOptionIndex;
    }

    const domain = activeChallenge.domain;

    if (isCorrect) {
      setSubmissionState('CORRECT');

      // Update progress atomically
      setProgress((prev) => {
        const isAlreadyCompleted = prev.completedIds.includes(activeChallenge.id);
        const baseEarned = isAlreadyCompleted ? 0 : activeChallenge.xpReward;
        setLastEarnedXp(baseEarned);
        setLastWasReplay(isAlreadyCompleted);

        const newStreak = prev.streak + 1;
        const newBestStreak = Math.max(prev.bestStreak, newStreak);
        const newCompletedIds = isAlreadyCompleted
          ? prev.completedIds
          : [...prev.completedIds, activeChallenge.id];

        // Track session completions distinctly
        const newSessionCompleted = prev.sessionCompletedIds.includes(activeChallenge.id)
          ? prev.sessionCompletedIds
          : [...prev.sessionCompletedIds, activeChallenge.id];

        // Mission stats update: preserve best performance across lifetime replays
        const prevStats = prev.missionStats[activeChallenge.id] || {
          attempts: 0,
          cleanFirstAttempt: true,
          timesCompleted: 0,
          hintsUsedCount: 0,
        };

        // If already completed in the past, cleanFirstAttempt is PRESERVED and must NEVER downgrade!
        // If first solve, cleanFirstAttempt is true only if attempts was 0 before this solve.
        const isClean = isAlreadyCompleted
          ? (prevStats.cleanFirstAttempt ?? true)
          : prevStats.attempts === 0;

        const firstSolveAttempts = prevStats.firstSolveAttempts || (prevStats.attempts + 1);

        const newStats = {
          ...prevStats,
          attempts: prevStats.attempts + 1,
          timesCompleted: prevStats.timesCompleted + 1,
          cleanFirstAttempt: isClean,
          firstSolveAttempts,
          hintsUsedCount: (prevStats.hintsUsedCount || 0) + (hintRevealedThisAttempt ? 1 : 0),
          lastAttemptAt: new Date().toISOString(),
        };

        const prevDomainScore = prev.domainScores[domain] || { correct: 0, attempts: 0 };
        const updatedProgress: ArenaProgressV2 = {
          ...prev,
          xp: prev.xp + baseEarned,
          streak: newStreak,
          bestStreak: newBestStreak,
          completedIds: newCompletedIds,
          sessionCompletedIds: newSessionCompleted,
          missionStats: {
            ...prev.missionStats,
            [activeChallenge.id]: newStats,
          },
          domainScores: {
            ...prev.domainScores,
            [domain]: {
              correct: prevDomainScore.correct + 1,
              attempts: prevDomainScore.attempts + 1,
            },
          },
        };

        // Evaluate achievements on this updated state
        const newAchievements = evaluateAchievements(updatedProgress, allChallenges);
        // Delta check: only achievements that were NOT previously in prev.unlockedAchievementIds
        const newlyUnlocked = newAchievements.filter(
          (ach) => ach.unlocked && !prev.unlockedAchievementIds.includes(ach.id)
        );

        // ALWAYS update newlyUnlockedBadges strictly to newlyUnlocked (clears to [] if none newly unlocked)
        setNewlyUnlockedBadges(newlyUnlocked);

        const newUnlockedIds = [...prev.unlockedAchievementIds];
        const newTimestamps = { ...prev.achievementTimestamps };

        if (newlyUnlocked.length > 0) {
          const nowStr = new Date().toISOString();
          newlyUnlocked.forEach((ach) => {
            if (!newUnlockedIds.includes(ach.id)) {
              newUnlockedIds.push(ach.id);
              newTimestamps[ach.id] = nowStr;
            }
          });
        }

        updatedProgress.unlockedAchievementIds = newUnlockedIds;
        updatedProgress.achievementTimestamps = newTimestamps;

        const announcement = isAlreadyCompleted
          ? `Verified! Practice replay completed. 0 additional base XP. Consecutive correct streak is ${newStreak}.`
          : `Verified! Earned ${baseEarned} XP. Total XP is ${updatedProgress.xp}. Consecutive correct streak is ${newStreak}.`;
        setLiveAnnouncement(announcement);

        return updatedProgress;
      });
    } else {
      // Incorrect answer: NEVER DEDUCT EARNED XP!
      setSubmissionState('INCORRECT');
      setLastEarnedXp(0);
      setLastWasReplay(false);
      setNewlyUnlockedBadges([]);

      setProgress((prev) => {
        const prevDomainScore = prev.domainScores[domain] || { correct: 0, attempts: 0 };
        const prevStats = prev.missionStats[activeChallenge.id] || {
          attempts: 0,
          cleanFirstAttempt: true,
          timesCompleted: 0,
          hintsUsedCount: 0,
        };

        // An error on an already completed mission (replay) should not invalidate past clean first solve
        const isAlreadyCompleted = prev.completedIds.includes(activeChallenge.id);

        return {
          ...prev,
          streak: 0, // Reset consecutive correct answers streak
          missionStats: {
            ...prev.missionStats,
            [activeChallenge.id]: {
              ...prevStats,
              attempts: prevStats.attempts + 1,
              cleanFirstAttempt: isAlreadyCompleted ? prevStats.cleanFirstAttempt : false,
              hintsUsedCount: (prevStats.hintsUsedCount || 0) + (hintRevealedThisAttempt ? 1 : 0),
              lastAttemptAt: new Date().toISOString(),
            },
          },
          domainScores: {
            ...prev.domainScores,
            [domain]: {
              ...prevDomainScore,
              attempts: prevDomainScore.attempts + 1,
            },
          },
        };
      });

      setLiveAnnouncement(
        'Incorrect answer. 0 XP lost. Review the scenario and hint guidance, then retry.'
      );
    }

    setIsSubmitting(false);
  };

  const handleNextChallenge = () => {
    // Navigate to next uncompleted challenge or recommended mission and scroll directly to workbench
    if (recommendedMission && recommendedMission.id !== activeChallenge.id) {
      selectChallenge(recommendedMission.id, true);
      return;
    }
    const currentIndex = filteredChallenges.findIndex((c) => c.id === activeChallenge.id);
    const nextChallenge =
      filteredChallenges[(currentIndex + 1) % filteredChallenges.length] || allChallenges[0];
    if (nextChallenge) {
      selectChallenge(nextChallenge.id, true);
    }
  };

  const handleSelectSessionGoal = (goal: 1 | 3 | 5) => {
    setProgress((prev) => ({
      ...prev,
      sessionGoal: goal,
    }));
    setLiveAnnouncement(`Session goal updated to ${goal} distinct missions.`);
  };

  const handleResetSessionGoal = () => {
    setProgress((prev) => ({
      ...prev,
      sessionCompletedIds: [],
    }));
    setLiveAnnouncement('Session mission counter reset. Ready for your next session.');
  };

  const handleConfirmResetStats = () => {
    localStorage.removeItem('ccna_mentor_arena_progress_v2');
    localStorage.removeItem('ccna_mentor_arena_progress_v1');
    setProgress(DEFAULT_PROGRESS_V2);
    setCliInput('');
    setSelectedDisplayIndex(null);
    setSubmissionState('IDLE');
    setShowResetConfirm(false);
    setNewlyUnlockedBadges([]);
    setLiveAnnouncement('All CCNA Arena progress and stats have been reset to zero.');
  };

  // Helper icon renderer for achievements
  const renderAchievementIcon = (iconName: Achievement['iconName']) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'terminal':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'compass':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'award':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'target':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'network':
        return <Network className="w-4 h-4 text-emerald-400" />;
      default:
        return <Award className="w-4 h-4 text-emerald-400" />;
    }
  };

  const activeStats = progress.missionStats[activeChallenge.id];
  const isCurrentCompleted = progress.completedIds.includes(activeChallenge.id);

  return (
    <div className="space-y-6">
      {/* Accessible Screen-Reader Live Announcement Region */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* ================================================================= */}
      {/* 1. UPGRADED ARENA OVERVIEW & MISSION CONTROL HEADER               */}
      {/* ================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-6 shadow-sm">
        {/* Top Level Rank & Synopsis */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            {/* Zero-Pill Unboxed Metadata with Typographic Separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
              <span className="text-emerald-400 font-semibold">
                Level {rankInfo.level} · {rankInfo.title}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium">{progress.xp} Total XP</span>
              <span aria-hidden="true">·</span>
              <span>
                {activeCompletedCount} / {allChallenges.length} Missions Cleared
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 flex items-center gap-1 font-medium">
                <Flame className="w-3.5 h-3.5" />
                {progress.streak} Consecutive Correct
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              CCNA Configuration Dojo &amp; Skill Arena
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Step into the command line to bridge network topology designs with verified Cisco IOS syntax. Practice interface provisioning, troubleshoot subinterfaces, calculate VLSM, and validate routing logic without daily streaks or loss penalties.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 max-w-full">
            <button
              type="button"
              onClick={() => selectChallenge(recommendedMission.id, true)}
              className="min-h-[44px] flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition cursor-pointer max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Play className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Continue: {recommendedMission.title}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              title="Reset progress with confirmation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Stats</span>
            </button>
          </div>
        </div>

        {/* Pedagogical Learning Brief (Collapsible) */}
        <div className="border border-slate-800 rounded-lg bg-slate-950/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsBriefOpen(!isBriefOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pedagogical Learning Brief &amp; Practice Framework</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>{isBriefOpen ? 'Collapse Brief' : 'Expand Objectives & Sequence'}</span>
              {isBriefOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {isBriefOpen && (
            <div className="p-4 pt-1 border-t border-slate-800/80 space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Target Challenge &amp; Intended Learners
                  </div>
                  <p className="text-slate-300 text-xs">
                    <strong className="text-slate-100">Teaching Challenge:</strong> Low student participation and confidence when applying theoretical CCNA networking concepts to actual Cisco IOS command-line configuration and real-time troubleshooting.
                  </p>
                  <p className="text-slate-400 text-xs">
                    <strong className="text-slate-200">Intended Learners:</strong> Introductory to intermediate networking students and CCNA candidates bridging topology design with CLI syntax.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Suggested 5-Step Practice Sequence
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
                    <li><strong className="text-slate-100">Attempt Independently:</strong> Review scenario context and formulate command or option first.</li>
                    <li><strong className="text-slate-100">Use Hints Freely:</strong> Mentor hints clarify syntax and never deduct base XP or break streaks.</li>
                    <li><strong className="text-slate-100">Review Debrief:</strong> Study the CCNA pedagogical explanation on every attempt.</li>
                    <li><strong className="text-slate-100">Practice Replay:</strong> Use deliberate &quot;Practice Again&quot; to solidify muscle memory.</li>
                    <li><strong className="text-slate-100">Reflect:</strong> Record observations and confidence feedback in the Evidence view.</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Measurable Learning Objectives by Syllabus Domain
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1">
                    <span className="font-semibold text-slate-200 text-xs">1. Network Fundamentals</span>
                    <p className="text-[11px] text-slate-400">Identify cabling standards, broadcast/collision domains, and IPv4/IPv6 host addressing rules.</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1">
                    <span className="font-semibold text-slate-200 text-xs">2. IP Addressing &amp; Subnetting</span>
                    <p className="text-[11px] text-slate-400">Calculate prefix lengths, subnets, valid host ranges, and broadcast IPs without addressing waste.</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1">
                    <span className="font-semibold text-slate-200 text-xs">3. Cisco IOS Interface CLI</span>
                    <p className="text-[11px] text-slate-400">Provision IP addresses on physical ports and activate interfaces with correct syntax (&quot;no shutdown&quot;).</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1">
                    <span className="font-semibold text-slate-200 text-xs">4. VLANs &amp; Trunking</span>
                    <p className="text-[11px] text-slate-400">Configure 802.1Q subinterface encapsulation, VLAN tagging, and router-on-a-stick inter-VLAN routing.</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 space-y-1">
                    <span className="font-semibold text-slate-200 text-xs">5. IP Routing Architecture</span>
                    <p className="text-[11px] text-slate-400">Configure IPv4 static and default routes, diagnose routing tables, and identify next-hop forwarding paths.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-200">Formative Scope Notice:</strong> XP points, ranks, and badges in this arena reflect voluntary in-app formative practice activity. They do not constitute Cisco certification, formal institutional grades, or proof of unsupervised engineering competency.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reset Confirmation Modal / Card */}
        {showResetConfirm && (
          <div className="p-4 bg-slate-950 border border-amber-600/50 rounded-lg space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-100">
                  Confirm Progress Reset
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  This will reset your earned XP, consecutive correct streak, and badge progress back to zero. Replays and practice drills remain fully available.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmResetStats}
                className="min-h-[40px] px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="min-h-[40px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Overview Stats Grid: Rank Progress + Explicit XP Needed + Session Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800">
          {/* Card 1: Rank & Explicit XP-to-Next-Rank (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {rankInfo.title}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-emerald-400">
                    {rankInfo.isMaxRank
                      ? 'Maximum Engineering Rank Reached'
                      : `${rankInfo.xpNeeded} XP needed to reach Level ${rankInfo.level + 1}`}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono tabular-nums shrink-0">
                <div className="text-xs font-bold text-slate-200">{progress.xp} XP</div>
                <div className="text-[10px] text-slate-400">
                  Best Streak: {progress.bestStreak}
                </div>
              </div>
            </div>

            {/* Rank Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                <span>Rank Progress</span>
                <span>{rankInfo.progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${rankInfo.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Choose-Your-Session Goal (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  Session Goal (Choose Your Pace)
                </span>
              </div>

              {/* Segmented Session Goal Selector */}
              <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-md font-mono text-[11px]">
                {([1, 3, 5] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSelectSessionGoal(g)}
                    className={`px-2 py-1 rounded transition cursor-pointer min-h-[30px] ${
                      sessionGoalTarget === g
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {g} {g === 1 ? 'Mission' : 'Missions'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Session Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                <span>Distinct Missions Completed This Session</span>
                <span className="text-cyan-300 font-medium">
                  {sessionCompletedCount} / {sessionGoalTarget}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((sessionCompletedCount / sessionGoalTarget) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Session Celebration or Quiet Motivation */}
            {isSessionGoalAchieved ? (
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded px-2.5 py-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Session Goal Completed! Great focused practice.</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetSessionGoal}
                  className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Start New Session
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-mono">
                Zero daily pressure · Practice at your own pace without streak loss penalties.
              </div>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs: Missions vs Achievements vs Category Mastery vs Evidence */}
        <div className="flex items-center overflow-x-auto border-b border-slate-800 text-xs font-mono pt-1 max-w-full">
          {[
            { id: 'missions', label: `Missions & Drills (${allChallenges.length})` },
            {
              id: 'achievements',
              label: `Achievements (${achievements.filter((a) => a.unlocked).length}/${achievements.length})`,
            },
            { id: 'mastery', label: 'Practice Coverage (5 Domains)' },
            { id: 'evidence', label: 'Learning Evidence & Reflection' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-[40px] px-4 py-2 border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-300 font-semibold bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. ACHIEVEMENTS TAB VIEW                                          */}
      {/* ================================================================= */}
      {activeTab === 'achievements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                CCNA Engineering Achievements
              </h3>
              <p className="text-xs text-slate-400">
                Badges are derived strictly from your verified mission completions and correct command execution.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-medium">
              {achievements.filter((a) => a.unlocked).length} of {achievements.length} Unlocked
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                  ach.unlocked
                    ? 'bg-slate-950/80 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 opacity-80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg border shrink-0 ${
                          ach.unlocked
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        {renderAchievementIcon(ach.iconName)}
                      </div>
                      <div className="font-semibold text-xs text-slate-100">
                        {ach.title}
                      </div>
                    </div>

                    <div className="text-[11px] font-mono shrink-0">
                      {ach.unlocked ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Unlock className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Requirement</span>
                    <span className="text-slate-200">
                      {ach.progressCurrent} / {ach.progressTarget}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {ach.requirementDescription}
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ach.unlocked ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((ach.progressCurrent / ach.progressTarget) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. CATEGORY MASTERY TAB VIEW                                      */}
      {/* ================================================================= */}
      {activeTab === 'mastery' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                CCNA 200-301 Practice Coverage by Domain
              </h3>
              <p className="text-xs text-slate-400">
                Practice coverage indicators reflect available in-app practice missions across the five core syllabus categories and do not represent formal certification or proof of full CCNA mastery.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              5 Core Syllabus Categories
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryMastery.map((cat) => {
              const meta = DOMAIN_META[cat.domain];
              return (
                <div
                  key={cat.domain}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-100">
                        {cat.shortLabel}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-medium ${
                          cat.masteryTier === 'Mastered'
                            ? 'text-emerald-400'
                            : cat.masteryTier === 'Proficient'
                            ? 'text-cyan-400'
                            : cat.masteryTier === 'Developing'
                            ? 'text-amber-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {cat.masteryTier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800 font-mono text-xs tabular-nums">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Practice Coverage</span>
                      <span className="text-emerald-400">
                        {cat.completedCount} / {cat.totalCount} ({cat.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilter(cat.domain);
                        setActiveTab('missions');
                        const first = allChallenges.find((c) => c.domain === cat.domain);
                        if (first) selectChallenge(first.id, true);
                      }}
                      className="w-full min-h-[36px] mt-1 text-center py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] rounded transition cursor-pointer"
                    >
                      Practice {cat.shortLabel} Missions &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-200">Formative Scope Clarification:</strong> Domain coverage tracks distinct practice completions inside this application. It provides self-paced learning indicators rather than accredited institutional assessment.
            </span>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. LEARNING EVIDENCE & REFLECTION TAB VIEW                        */}
      {/* ================================================================= */}
      {activeTab === 'evidence' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-6">
          {/* Header & Export Actions */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1 max-w-2xl">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Learning Evidence &amp; Formative Reflection</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review verified completion records, practice attempts, accuracy denominators, and hint support. Capture reflections and export authentic learning indicators for your engineering portfolio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportTextEvidence}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Markdown (.md)</span>
              </button>
              <button
                type="button"
                onClick={handleExportJsonEvidence}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON (.json)</span>
              </button>
            </div>
          </div>

          {/* 4 Key Practice Indicator Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Practice Coverage
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {activeCompletedCount} / {allChallenges.length}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono">
                {evidenceSummary.practiceCoveragePct}% Catalog Coverage
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Submitted Accuracy
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {evidenceSummary.accuracyLabel}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {evidenceSummary.totalAttemptsSubmitted === 0
                  ? 'Ready for first submission'
                  : `${evidenceSummary.totalCorrectCompletions} correct / ${evidenceSummary.totalAttemptsSubmitted} submitted`}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Hint Usage
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {evidenceSummary.missionsWithHints} Missions
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Used hints as learning scaffolds (0 XP lost)
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Streak &amp; Clean Runs
              </div>
              <div className="text-lg font-bold text-amber-400 font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{progress.streak} Current Streak</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {evidenceSummary.cleanFirstAttemptCompletions} 1st-attempt clean fixes
              </div>
            </div>
          </div>

          {/* Per-Mission Learning Evidence Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Detailed Practice Log &amp; Measurable Objectives
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Core Catalog ({CORE_MISSION_IDS.length}) + Active Topology ({liveTopologyChallenges.length})
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                  <tr>
                    <th scope="col" className="p-3">Mission &amp; Domain</th>
                    <th scope="col" className="p-3 min-w-[200px]">Learning Objective</th>
                    <th scope="col" className="p-3">Status</th>
                    <th scope="col" className="p-3 text-right">Attempts</th>
                    <th scope="col" className="p-3">Best Performance</th>
                    <th scope="col" className="p-3">Hint Scaffold</th>
                    <th scope="col" className="p-3 text-right">Completions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {allChallenges.map((c) => {
                    const stats = progress.missionStats?.[c.id];
                    const isCompleted = progress.completedIds.includes(c.id);

                    let performanceLabel = 'Pending Attempt';
                    if (stats?.isHistoricalV1) {
                      performanceLabel = 'Untracked (Legacy v1)';
                    } else if (stats?.cleanFirstAttempt === true) {
                      performanceLabel = '1st Attempt Clean';
                    } else if (stats?.bestAttemptsToSuccess && stats.bestAttemptsToSuccess > 0) {
                      performanceLabel = `${stats.bestAttemptsToSuccess} Attempts`;
                    } else if (stats?.attemptsSubmitted && stats.attemptsSubmitted > 0) {
                      performanceLabel = 'In Progress';
                    }

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3">
                          <div className="font-semibold text-slate-200 font-sans">
                            {c.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {DOMAIN_META[c.domain].label} · {c.difficulty}
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-300 text-[11px]">
                          {c.learningObjective || 'CCNA configuration and troubleshooting drill.'}
                        </td>
                        <td className="p-3">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Incomplete
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {stats?.isHistoricalV1
                            ? 'Legacy'
                            : (stats?.attemptsSubmitted ?? 0)}
                        </td>
                        <td className="p-3 text-[11px]">
                          <span
                            className={
                              stats?.cleanFirstAttempt
                                ? 'text-emerald-400'
                                : stats?.bestAttemptsToSuccess
                                ? 'text-slate-200'
                                : 'text-slate-500'
                            }
                          >
                            {performanceLabel}
                          </span>
                        </td>
                        <td className="p-3 text-[11px]">
                          {stats?.isHistoricalV1 ? (
                            <span className="text-slate-500">Untracked</span>
                          ) : (stats?.hintsUsedCount ?? 0) > 0 ? (
                            <span className="text-amber-400">Used ({stats?.hintsUsedCount})</span>
                          ) : (
                            <span className="text-slate-400">No Hints</span>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {stats?.completionsCount ?? (isCompleted ? 1 : 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Learner Reflection & Feedback Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Optional Formative Learner Reflection &amp; Feedback</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Document key insights, syntax takeaways, and evaluate your confidence growth.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Saved locally on this device
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="reflection-learned" className="font-semibold text-slate-200">
                  1. What key networking concepts or IOS commands did you learn or reinforce?
                </label>
                <textarea
                  id="reflection-learned"
                  rows={3}
                  value={reflection.whatLearned}
                  onChange={(e) => setReflection({ ...reflection, whatLearned: e.target.value })}
                  placeholder="e.g. Mastered subinterface 802.1Q encapsulation syntax on router-on-a-stick, or clarified wildcard masks in OSPF..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reflection-next" className="font-semibold text-slate-200">
                  2. What specific concept or task do you need to practise next?
                </label>
                <textarea
                  id="reflection-next"
                  rows={2}
                  value={reflection.whatToPracticeNext}
                  onChange={(e) => setReflection({ ...reflection, whatToPracticeNext: e.target.value })}
                  placeholder="e.g. Practice calculating VLSM subnets under timed pressure, or troubleshoot missing default-routes..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="reflection-confidence" className="font-semibold text-slate-200">
                    3. Engagement &amp; Confidence Impact (select one):
                  </label>
                  <select
                    id="reflection-confidence"
                    value={reflection.confidenceFeedback}
                    onChange={(e) => setReflection({ ...reflection, confidenceFeedback: e.target.value })}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-sans"
                  >
                    <option value="">(Select confidence impact...)</option>
                    <option value="Significantly increased confidence with Cisco IOS syntax">
                      Significantly increased confidence with Cisco IOS syntax
                    </option>
                    <option value="Moderately increased confidence with Cisco IOS syntax">
                      Moderately increased confidence with Cisco IOS syntax
                    </option>
                    <option value="Neutral / Same confidence level">
                      Neutral / Same confidence level
                    </option>
                    <option value="Need more practice with interface commands">
                      Need more practice with interface commands
                    </option>
                    <option value="Need more practice with VLANs & Subinterfaces">
                      Need more practice with VLANs &amp; Subinterfaces
                    </option>
                    <option value="Need more practice with Subnetting & Routing">
                      Need more practice with Subnetting &amp; Routing
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reflection-suggestions" className="font-semibold text-slate-200">
                    4. Suggestions for Tool / Mission Iteration:
                  </label>
                  <input
                    id="reflection-suggestions"
                    type="text"
                    value={reflection.suggestions}
                    onChange={(e) => setReflection({ ...reflection, suggestions: e.target.value })}
                    placeholder="e.g. Add more multi-area OSPF or ACL debugging drills..."
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveReflection}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Save Reflection to Device
                </button>

                {reflectionSavedToast && (
                  <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                    <Check className="w-4 h-4" />
                    <span>Saved to local storage successfully!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Device Notice & Disclaimers */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-400 leading-relaxed">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Data Privacy &amp; Formative Scope Disclosure</span>
            </div>
            <p>
              Your practice data and reflections are stored exclusively in your browser's localStorage (<code className="text-emerald-400">ccna_arena_learner_reflections_v1</code>). No external trackers, user telemetry, or third-party servers receive this data.
            </p>
            <p>
              These indicators represent self-directed formative practice indicators only. They do not constitute measured learning gain, classroom attendance, formal academic grades, or completion of formal CCNA certification or SDL requirements.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. MISSIONS WORKSPACE (FILTER BAR + LIST + WORKBENCH)              */}
      {/* ================================================================= */}
      {activeTab === 'missions' && (
        <div className="space-y-6">
          {/* Domain Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  selectedFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Missions ({allChallenges.length})
              </button>

              {liveTopologyChallenges.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter('LIVE');
                    selectChallenge(liveTopologyChallenges[0].id);
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    selectedFilter === 'LIVE'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Your Topology ({liveTopologyChallenges.length})</span>
                </button>
              )}

              {(Object.keys(DOMAIN_META) as SkillDomain[]).map((domainKey) => (
                <button
                  key={domainKey}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(domainKey);
                    const first = allChallenges.find((c) => c.domain === domainKey);
                    if (first) selectChallenge(first.id);
                  }}
                  className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                    selectedFilter === domainKey
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {DOMAIN_META[domainKey].shortLabel}
                </button>
              ))}
            </div>

            {!report && (
              <div className="text-xs text-slate-400 font-mono">
                Tip: Upload a topology in Topology Intake to unlock custom missions for your own diagram.
              </div>
            )}
          </div>

          {/* Main Arena Split View: Left Mission List (4 cols) + Right Interactive Workbench (8 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Mission Cards List */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Mission Catalog
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {filteredChallenges.length} Available
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-[580px] overflow-y-auto">
                {filteredChallenges.map((challenge, idx) => {
                  const isCurrent = challenge.id === activeChallenge.id;
                  const isDone = progress.completedIds.includes(challenge.id);
                  const isRecommended = recommendedMission.id === challenge.id;
                  const stats = progress.missionStats[challenge.id];

                  return (
                    <button
                      key={challenge.id}
                      type="button"
                      onClick={() => selectChallenge(challenge.id)}
                      className={`w-full text-left p-4 transition cursor-pointer flex items-start justify-between gap-3 min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                        isCurrent
                          ? 'bg-emerald-950/30 border-l-2 border-emerald-400'
                          : 'hover:bg-slate-950/60'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        {/* Unboxed Metadata with Typographic Separators */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-400">
                          <span className={isCurrent ? 'text-emerald-400 font-bold' : ''}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {challenge.mode === 'CLI_DRILL'
                              ? 'CLI Drill'
                              : challenge.mode === 'CONFIG_DOCTOR'
                              ? 'Config Doctor'
                              : 'Architect Decision'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400">
                            {isDone ? 'Base XP Earned' : `+${challenge.xpReward} XP`}
                          </span>
                          {isRecommended && !isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-cyan-400 font-semibold">Recommended</span>
                            </>
                          )}
                        </div>

                        <div
                          className={`text-xs font-semibold leading-snug break-words ${
                            isCurrent ? 'text-emerald-300' : 'text-slate-200'
                          }`}
                        >
                          {challenge.title}
                        </div>

                        {/* Best performance stats & difficulty */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <span>{DOMAIN_META[challenge.domain].shortLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{challenge.difficulty}</span>
                          {stats && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-slate-400">
                                {stats.cleanFirstAttempt
                                  ? '1st Attempt Clean'
                                  : `${stats.firstSolveAttempts || stats.attempts} Attempts`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 mt-1">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronRight
                            className={`w-4 h-4 ${
                              isCurrent ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Challenge Workbench */}
            <div
              ref={workbenchRef}
              id="mission-workbench"
              tabIndex={-1}
              className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm outline-none"
            >
              {/* Challenge Header */}
              <div className="px-6 py-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                    <span className="text-emerald-400 font-semibold">
                      {DOMAIN_META[activeChallenge.domain].label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeChallenge.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400">
                      {isCurrentCompleted
                        ? 'Practice Replay (0 Base XP)'
                        : `Reward: +${activeChallenge.xpReward} XP`}
                    </span>
                    {activeChallenge.isLiveTopology && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-300">Generated from Your Topology</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 break-words">
                    {activeChallenge.title}
                  </h3>
                </div>

                <div className="shrink-0">
                  {isCurrentCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Completed · Practice Replay</span>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-slate-400">
                      Pending Completion
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Measurable Learning Objective */}
                {activeChallenge.learningObjective && (
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-lg p-3.5 space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Measurable Learning Objective</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {activeChallenge.learningObjective}
                    </p>
                  </div>
                )}

                {/* Scenario Context */}
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Engineering Scenario
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 border border-slate-800 rounded-lg p-4">
                    {activeChallenge.scenario}
                  </p>
                </div>

                {/* Optional Broken Config Snippet for Config Doctor */}
                {activeChallenge.brokenConfigSnippet && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      Console Output / Configuration Under Review
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-amber-200/90 overflow-x-auto leading-relaxed">
                      {activeChallenge.brokenConfigSnippet}
                    </pre>
                  </div>
                )}

                {/* Task Prompt + Hint Toggle (Hints are encouraged and never penalize XP) */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs sm:text-sm font-semibold text-emerald-300">
                      Task: {activeChallenge.taskPrompt}
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleHint}
                      className="min-h-[36px] flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-emerald-400 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 px-2 rounded"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? 'Hide Hint' : 'Need a Hint? (Encouraged · 0 XP Penalty)'}</span>
                    </button>
                  </div>

                  {showHint && (
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
                      <div>
                        <strong className="text-emerald-400 font-mono">Mentor Hint: </strong>
                        {activeChallenge.hint}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Note: Hints are encouraged for real learning and never deduct base XP or reset your consecutive correct streak.
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Input Area: CLI Terminal Drill vs Multiple-Choice Decision */}
                {activeChallenge.mode === 'CLI_DRILL' ? (
                  <form onSubmit={handleVerifyAnswer} className="space-y-4">
                    {/* Interactive Command Token Builder */}
                    {activeChallenge.tokenPool && activeChallenge.tokenPool.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Quick-Build Command Tokens (click to insert or type directly):</span>
                          <button
                            type="button"
                            disabled={submissionState === 'CORRECT'}
                            onClick={() => {
                              if (submissionState === 'CORRECT') return;
                              setCliInput('');
                              setSubmissionState('IDLE');
                            }}
                            className="min-h-[32px] text-slate-400 hover:text-slate-200 disabled:opacity-40 cursor-pointer px-2"
                          >
                            Clear Line
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeChallenge.tokenPool.map((token, idx) => (
                            <button
                              key={`${token}-${idx}`}
                              type="button"
                              disabled={submissionState === 'CORRECT'}
                              onClick={() => handleAppendToken(token)}
                              className="min-h-[44px] px-3 py-2 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                            >
                              {token}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simulated Cisco IOS Terminal Line */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs sm:text-sm space-y-2">
                      <div className="text-[11px] text-slate-500">
                        Cisco IOS Interactive Command Line · Standard abbreviations (e.g. &quot;no shut&quot;, &quot;sh ip int br&quot;) accepted
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold shrink-0 select-none">
                          {activeChallenge.iosPrompt || 'Router(config)#'}
                        </span>
                        <input
                          type="text"
                          value={cliInput}
                          disabled={submissionState === 'CORRECT'}
                          readOnly={submissionState === 'CORRECT'}
                          onChange={(e) => {
                            if (submissionState === 'CORRECT') return;
                            setCliInput(e.target.value);
                            if (submissionState !== 'IDLE') setSubmissionState('IDLE');
                          }}
                          placeholder={
                            submissionState === 'CORRECT'
                              ? 'Verified. Click "Practice Again" to re-test command.'
                              : 'Type Cisco IOS command here...'
                          }
                          className="w-full bg-transparent text-slate-100 disabled:text-emerald-300 focus:outline-none font-mono min-h-[36px]"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="submit"
                        disabled={!cliInput.trim() || isSubmitting || submissionState === 'CORRECT'}
                        className="min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        {isSubmitting
                          ? 'Verifying...'
                          : submissionState === 'CORRECT'
                          ? 'Verified ✓ (Practice Again to Re-run)'
                          : 'Execute & Verify Command'}
                      </button>

                      {report && onJumpToStage && (
                        <button
                          type="button"
                          onClick={() => onJumpToStage('stage3')}
                          className="min-h-[44px] text-xs font-mono text-slate-400 hover:text-emerald-400 transition cursor-pointer px-2"
                        >
                          Inspect Stage 3 Annotated CLI &rarr;
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      {(optionPermutation.length > 0
                        ? optionPermutation
                        : (activeChallenge.options || []).map((_, i) => i)
                      ).map((origIdx, displayIdx) => {
                        const optionText = activeChallenge.options?.[origIdx];
                        const isSelected = selectedDisplayIndex === displayIdx;
                        const isCorrectChoice =
                          submissionState !== 'IDLE' && origIdx === activeChallenge.correctOptionIndex;
                        const isWrongSelected = submissionState === 'INCORRECT' && isSelected;

                        return (
                          <button
                            key={`${origIdx}-${displayIdx}`}
                            type="button"
                            disabled={submissionState === 'CORRECT'}
                            onClick={() => {
                              if (submissionState === 'CORRECT') return;
                              setSelectedDisplayIndex(displayIdx);
                              setSubmissionState('IDLE');
                            }}
                            className={`w-full text-left p-4 rounded-lg border text-xs sm:text-sm font-mono transition cursor-pointer flex items-start gap-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              isCorrectChoice
                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                                : isWrongSelected
                                ? 'bg-red-950/40 border-red-500 text-red-200'
                                : isSelected
                                ? 'bg-slate-800 border-emerald-500/70 text-slate-100'
                                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="font-bold text-emerald-400 shrink-0">
                              {String.fromCharCode(65 + displayIdx)}.
                            </span>
                            <span className="leading-relaxed break-words">{optionText}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={selectedDisplayIndex === null || isSubmitting || submissionState === 'CORRECT'}
                        onClick={() => handleVerifyAnswer()}
                        className="min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        {isSubmitting
                          ? 'Verifying...'
                          : submissionState === 'CORRECT'
                          ? 'Verified ✓ (Practice Again to Re-run)'
                          : 'Verify Answer'}
                      </button>

                      {report && onJumpToStage && (
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToStage(
                              activeChallenge.domain === 'VLSM_ADDRESSING'
                                ? 'stage2'
                                : activeChallenge.domain === 'ROUTING_ARCHITECTURE'
                                ? 'stage4'
                                : 'stage1'
                            )
                          }
                          className="min-h-[44px] text-xs font-mono text-slate-400 hover:text-emerald-400 transition cursor-pointer px-2"
                        >
                          Cross-Check Active Topology Stage &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ======================================================= */}
                {/* 5. INSTANT FEEDBACK & PEDAGOGICAL DEBRIEF               */}
                {/* ======================================================= */}
                {submissionState !== 'IDLE' && (
                  <div
                    className={`p-5 rounded-xl border space-y-4 ${
                      submissionState === 'CORRECT'
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                        : 'bg-red-950/25 border-red-500/50 text-red-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        {submissionState === 'CORRECT' ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>
                              {lastWasReplay
                                ? 'Configuration Verified! Practice Replay (+0 Base XP)'
                                : `Configuration Verified! +${lastEarnedXp} Base XP Awarded`}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span>Not Quite — Review the Guidance Below</span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {activeChallenge.ccnaReference}
                      </span>
                    </div>

                    {/* What Was Learned / Debrief */}
                    <div className="space-y-1.5 text-xs text-slate-200 leading-relaxed">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                        {submissionState === 'CORRECT'
                          ? 'What You Learned (CCNA Concept)'
                          : 'Targeted Guidance (0 XP Lost)'}
                      </div>
                      <p>{activeChallenge.mentorExplanation}</p>
                    </div>

                    {/* Expected Syntax Example on CLI Incorrect */}
                    {submissionState === 'INCORRECT' &&
                      activeChallenge.mode === 'CLI_DRILL' &&
                      activeChallenge.acceptedCommands && (
                        <div className="text-xs font-mono text-amber-300 pt-1">
                          Expected Syntax Example:{' '}
                          <code className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300">
                            {activeChallenge.acceptedCommands[0]}
                          </code>
                        </div>
                      )}

                    {/* Newly Unlocked Achievements Highlight */}
                    {newlyUnlockedBadges.length > 0 && (
                      <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-lg space-y-1.5">
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>New Achievement Unlocked!</span>
                        </div>
                        {newlyUnlockedBadges.map((badge) => (
                          <div key={badge.id} className="text-xs text-slate-200">
                            <strong className="text-emerald-400">{badge.title}: </strong>
                            {badge.description}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Next Mission & Practice Again Action Buttons */}
                    {submissionState === 'CORRECT' && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-800/40">
                        <div className="text-[11px] font-mono text-emerald-300">
                          Streak: {progress.streak} consecutive correct answers
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePracticeAgain}
                            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Practice Again</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNextChallenge}
                            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <span>Next Mission</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
