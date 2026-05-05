import { useContext } from "react";
import { EventContext } from "../contexts/EventContext";

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("useEvents must be used inside <EventProvider>");
  }
  return ctx;
}
