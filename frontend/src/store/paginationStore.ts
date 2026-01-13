import { create } from 'zustand';

interface PaginationState {
  page: number;
  limit: number;
  search: string;
  total: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setTotal: (total: number) => void;
  reset: () => void;
}

const createPaginationStore = () => create<PaginationState>((set) => ({
  page: 1,
  limit: 10,
  search: '',
  total: 0,
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setTotal: (total) => set({ total }),
  reset: () => set({ page: 1, limit: 10, search: '', total: 0 }),
}));

export const useStudentsPagination = createPaginationStore();
export const useLibraryPagination = createPaginationStore();
export const useClinicPagination = createPaginationStore();
export const useFeesPagination = createPaginationStore();
export const useUsersPagination = createPaginationStore();
export const useClassesPagination = createPaginationStore();
