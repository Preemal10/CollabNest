import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization, CreateOrganizationPayload } from '@collabnest/shared';
import { organizationsApi } from '@/services/api';

// Organizations state interface
interface OrganizationsState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  isCreateModalOpen: boolean;
}

// Initial state
const initialState: OrganizationsState = {
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
  isCreateModalOpen: false,
};

// Async thunks
export const fetchOrganizations = createAsyncThunk(
  'organizations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await organizationsApi.list();
      return response.organizations;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch organizations');
    }
  }
);

export const fetchOrganization = createAsyncThunk(
  'organizations/fetchOne',
  async (orgId: string, { rejectWithValue }) => {
    try {
      const response = await organizationsApi.get(orgId);
      return response.organization;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch organization');
    }
  }
);

export const createOrganization = createAsyncThunk(
  'organizations/create',
  async (payload: CreateOrganizationPayload, { rejectWithValue }) => {
    try {
      const response = await organizationsApi.create(payload);
      return response.organization;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create organization');
    }
  }
);

// Organizations slice
const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCurrentOrganization(state, action: PayloadAction<Organization | null>) {
      state.currentOrganization = action.payload;
    },
    openCreateModal(state) {
      state.isCreateModalOpen = true;
    },
    closeCreateModal(state) {
      state.isCreateModalOpen = false;
    },
  },
  extraReducers: (builder) => {
    // Fetch all organizations
    builder
      .addCase(fetchOrganizations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.organizations = action.payload;
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single organization
    builder
      .addCase(fetchOrganization.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganization.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrganization = action.payload;
      })
      .addCase(fetchOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create organization
    builder
      .addCase(createOrganization.pending, (state) => {
        state.error = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.organizations.unshift(action.payload);
        state.isCreateModalOpen = false;
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentOrganization, openCreateModal, closeCreateModal } = organizationsSlice.actions;
export default organizationsSlice.reducer;
