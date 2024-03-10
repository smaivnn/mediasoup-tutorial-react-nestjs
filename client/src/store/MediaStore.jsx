import { create } from "zustand";

const MediaStore = create((set) => ({
  roomId: "",
  setRoomId: (roomId) => set({ roomId }),
  removeRoomId: () => set({ roomId: "" }),

  media_socket: null,
  setSocket: (socket) => set({ socket }),
  removeSocket: () => set({ socket: null }),

  rooms: {},
  setRooms: (rooms) => set({ rooms }),
  removeRooms: () => set({ rooms: {} }),
}));

export default MediaStore;
