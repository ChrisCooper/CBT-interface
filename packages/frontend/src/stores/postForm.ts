import { create } from "zustand";

interface PostFormState {
  title: string;
  content: string;
  authorId: string;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setAuthorId: (authorId: string) => void;
  reset: () => void;
}

export const usePostFormStore = create<PostFormState>((set) => ({
  title: "",
  content: "",
  authorId: "",
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  setAuthorId: (authorId) => set({ authorId }),
  reset: () => set({ title: "", content: "" }),
}));
