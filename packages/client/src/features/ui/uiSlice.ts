import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Modal types
type ModalType = 
  | 'createProject'
  | 'createBoard'
  | 'createTask'
  | 'taskDetails'
  | 'settings'
  | 'invite'
  | null;

// UI state interface
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;
  theme: 'light' | 'dark' | 'system';
  isCommandPaletteOpen: boolean;
  notifications: {
    unreadCount: number;
    panelOpen: boolean;
  };
}

// Get initial theme from localStorage or system preference
function getInitialTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

// Apply theme to document
function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
  
  localStorage.setItem('theme', theme);
}

// Initial state
const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  theme: getInitialTheme(),
  isCommandPaletteOpen: false,
  notifications: {
    unreadCount: 0,
    panelOpen: false,
  },
};

// Apply initial theme
applyTheme(initialState.theme);

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    openModal(state, action: PayloadAction<{ type: ModalType; data?: Record<string, unknown> }>) {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data ?? null;
    },
    closeModal(state) {
      state.activeModal = null;
      state.modalData = null;
    },
    setTheme(state, action: PayloadAction<'light' | 'dark' | 'system'>) {
      state.theme = action.payload;
      applyTheme(action.payload);
    },
    toggleCommandPalette(state) {
      state.isCommandPaletteOpen = !state.isCommandPaletteOpen;
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.isCommandPaletteOpen = action.payload;
    },
    setUnreadNotificationCount(state, action: PayloadAction<number>) {
      state.notifications.unreadCount = action.payload;
    },
    incrementUnreadNotifications(state) {
      state.notifications.unreadCount += 1;
    },
    toggleNotificationPanel(state) {
      state.notifications.panelOpen = !state.notifications.panelOpen;
    },
    setNotificationPanelOpen(state, action: PayloadAction<boolean>) {
      state.notifications.panelOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  openModal,
  closeModal,
  setTheme,
  toggleCommandPalette,
  setCommandPaletteOpen,
  setUnreadNotificationCount,
  incrementUnreadNotifications,
  toggleNotificationPanel,
  setNotificationPanelOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
