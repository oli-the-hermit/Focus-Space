// SSoT String & UI Dictionary (No hardcoded strings in components)
export const strings = {
  app: {
    title: 'Focus Space',
    tagline: 'Minimalist Time Tracker',
    description: 'A calm, minimal focus timer with sessions, task lists, goals, landmarks, and rewards.'
  },
  status: {
    ready: 'Ready',
    focusing: 'Focusing',
    onBreak: 'On Break',
    paused: 'Paused'
  },
  tabs: {
    timer: 'Timer & Sessions',
    agenda: "Today's Agenda",
    tasks: 'Tasks',
    calendar: 'Calendar',
    stats: 'Analytics & Stats',
    goals: 'Goals & Landmarks',
    rewards: 'Rewards'
  },
  timer: {
    focusPhase: 'Focus',
    breakPhase: 'Break',
    noSession: 'No session selected',
    sessionProgress: 'Session Progress',
    rewardOnCompletion: 'Reward on completion:',
    activeTaskList: 'Active Task List',
    selectTaskListPrompt: 'Select a task list in the right panel to view tasks during session.',
    noListSelected: '— No task list selected —',
    sessionsTitle: 'Sessions',
    newSessionBtn: '+ New Session',
    resetTooltip: 'Reset Timer',
    skipTooltip: 'Skip Phase'
  },
  agenda: {
    heading: "Today's Agenda",
    subheading: 'Scheduled focus sessions for today',
    timelineTitle: '📅 Today\'s Timeline',
    scheduleBtn: '+ Schedule for Today',
    emptyTimeline: 'No sessions scheduled for today yet.',
    noUpcomingHero: 'No sessions left for today. Click "+ Schedule for Today" to add one!'
  },
  tasks: {
    sidebarTitle: 'Task Lists',
    newListBtn: '+ New List',
    selectListPrompt: 'Select or create a list to get started.',
    addTaskPlaceholder: 'Add a task and press Enter…',
    addTaskBtn: 'Add',
    tasksCount: 'tasks',
    renameTooltip: 'Rename List',
    duplicateTooltip: 'Duplicate List',
    deleteTooltip: 'Delete List'
  },
  calendar: {
    prevBtn: '← Prev',
    todayBtn: 'Today',
    nextBtn: 'Next →',
    scheduleSessionBtn: '+ Schedule Session',
    views: {
      week: 'Week',
      day: 'Day',
      month: 'Month'
    }
  },
  stats: {
    avgSessionsDay: 'Avg Sessions / Day',
    avgWorkedDay: 'Avg Worked Time / Day',
    avgTasksCompletedDay: 'Avg Tasks Completed / Day',
    avgTimePerTask: 'Avg Time per Task',
    productiveDaysTitle: '📅 Most Productive Days of the Week',
    completionLogsTitle: '⏱️ Task Completion Log',
    emptyLogs: 'No tasks completed yet. Check off tasks during sessions to see timing stats!'
  },
  goals: {
    allFilter: 'All',
    newGoalBtn: '+ New Goal',
    emptyGoals: 'No goals yet. Add your first goal to stay motivated!'
  },
  rewards: {
    readyToClaim: 'Ready to Claim',
    inProgress: 'In Progress',
    claimed: 'Claimed',
    newRewardBtn: '+ New Reward',
    emptyReady: 'Complete sessions, landmarks, or goals to unlock rewards.',
    emptyLocked: 'No locked rewards yet.',
    emptyClaimed: 'Claimed rewards will appear here.',
    claimBtn: '🎁 Claim Reward!',
    linkSessionLabel: 'Link to Focus Session (optional)',
    noSessionLinked: '— No session linked —',
    linkGoalLabel: 'Link to Goal (optional)',
    noGoalLinked: '— No goal linked —',
    noReward: '— No reward —',
    rewardOnCompletion: 'Reward on Completion (optional)'
  },
  celebration: {
    rewardClaimed: 'Reward Claimed!',
    desc: "You've earned your reward.",
    awesomeBtn: 'Awesome!'
  },
  notifications: {
    modalTitle: 'Notification Settings',
    enableLabel: 'Enable Calendar Event Notifications',
    leadTimeLabel: 'Anticipation Lead Time',
    soundLabel: 'Play chime sound on notification',
    browserPermLabel: 'Browser Permissions',
    requestPermBtn: 'Enable Push Notifications',
    permGrantedMsg: '✅ Browser notification permissions granted!'
  },
  auth: {
    serverUnreachable: 'Cannot reach the local app server. Start it with npm run dev and reload.',
    signInTitle: 'Welcome back',
    signInSubtitle: 'Sign in to your profile to continue.',
    setupTitle: 'Create your main account',
    setupSubtitle: 'This account manages profiles and is created only once.',
    usernameLabel: 'Username',
    displayNameLabel: 'Display name',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    signInBtn: 'Sign In',
    createAccountBtn: 'Create Main Account',
    fieldRequired: 'Please fill in all fields.',
    passwordsDontMatch: 'Passwords do not match.',
    weakPassword: 'Password must be at least 8 characters.',
    switchToLogin: 'Already have an account? Sign in',
    switchToSetup: 'No account? Create the main account',
    signingIn: 'Signing in…',
    creating: 'Creating…',
    restoringSession: 'Restoring session…'
  },
  userMenu: {
    profile: 'Profile',
    settings: 'Settings',
    exit: 'Exit'
  },
  profile: {
    title: 'Profile',
    avatarLabel: 'Profile Photo',
    changePhotoBtn: 'Change photo',
    removePhotoBtn: 'Remove photo',
    photoTooLarge: 'Image is too large (max 1 MB).',
    nameLabel: 'Name',
    usernameLabel: 'Username',
    saveBtn: 'Save Changes',
    savedMsg: 'Profile updated.',
    usernameTakenMsg: 'That username is already taken by another profile.',
    passwordSectionTitle: 'Change Password',
    currentPasswordLabel: 'Current password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm new password',
    passwordsDontMatchMsg: 'New passwords do not match.',
    wrongPasswordMsg: 'Current password is incorrect.',
    passwordChangedMsg: 'Password updated. Other sessions have been signed out.',
    deleteOwnTitle: 'Delete My Profile',
    deleteOwnBtn: 'Delete my profile',
    deleteOwnConfirmMsg: 'This permanently deletes your profile and all of your local data. This action cannot be undone.',
    deleteOwnExecMsg: 'Profile deleted.',
    deleteBtn: 'Delete',
    cancelBtn: 'Cancel'
  },
  settings: {
    title: 'Settings',
    appearanceTitle: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    profilesSectionTitle: 'Profiles',
    profilesSubtitle: 'Manage profiles on this device.',
    profileCounter: '{count} of {max} profiles',
    addProfileBtn: '+ Add Profile',
    addProfileTitle: 'New Profile',
    renameBtn: 'Rename',
    deleteBtn: 'Delete',
    deleteProfileConfirmMsg: 'Delete this profile and all of its data? This cannot be undone.',
    emptyProfilesMsg: 'No additional profiles yet.',
    dangerZoneTitle: 'Danger Zone',
    resetProfilesBtn: 'Reset User Profiles',
    resetProfilesDesc: 'Deletes every user profile and its data, keeping only the main account.',
    resetConfirmTitle: 'Delete All User Profiles?',
    resetConfirmMsg: 'All profiles except the main account, with their personal goals, rewards and agendas, will be permanently deleted.',
    resetPasswordTitle: 'Confirm Your Password',
    resetPasswordMsg: 'Enter your password to confirm this permanent deletion.',
    resetOkMsg: 'User profiles have been reset.',
    cancelBtn: 'Cancel',
    confirmBtn: 'Confirm'
  }
} as const;

export type StringDictionary = typeof strings;
