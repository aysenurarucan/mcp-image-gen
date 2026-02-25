import PocketBase from "pocketbase";
import { Capacitor } from "@capacitor/core";

export const pb = new PocketBase(import.meta.env.VITE_PB_URL);
