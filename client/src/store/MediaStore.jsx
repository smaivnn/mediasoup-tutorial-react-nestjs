import { create } from "zustand";

const MediaStore = create((set) => ({
  roomId: "",
  setRoomId: (roomId) => set({ roomId }),
  removeRoomId: () => set({ roomId: "" }),

  media_socket: null,
  setSocket: (media_socket) => set({ media_socket }),
  removeSocket: () => set({ socket: null }),

  rooms: {},
  setRooms: (rooms) => set({ rooms }),
  removeRooms: () => set({ rooms: {} }),

  audioParams: null,
  setAudioParams: (audioParams) => set({ audioParams }),
  removeAudioParams: () => set({ audioParams: null }),

  videoParams: null,
  setVideoParams: (videoParams) => set({ videoParams }),
  removeVideoParams: () => set({ videoParams: null }),

  device: null,
  setDevice: (device) => set({ device }),
  removeDevice: () => set({ device: null }),

  sendTransport: null,
  setSendTransport: (sendTransport) => set({ sendTransport }),
  removeSendTransport: () => set({ sendTransport: null }),

  recvTransport: new Map(),
  setRecvTransport: (socketId, transport) =>
    set((state) => {
      const newRecvTransport = new Map(state.recvTransport);
      newRecvTransport.set(socketId, transport);
      console.log(newRecvTransport);
      return { recvTransport: newRecvTransport };
    }),
  removeRecvTransport: (socketId) =>
    set((state) => {
      const newRecvTransport = new Map(state.recvTransport);
      newRecvTransport.delete(socketId);
      return { recvTransport: newRecvTransport };
    }),
  getRecvTransport: (socketId) => (state) => state.recvTransport.get(socketId),
}));

export default MediaStore;
