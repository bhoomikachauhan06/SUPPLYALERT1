"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * NaviContext
 * Stores screen data context, chat history, and sidebar state.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mlUsed?: boolean;
  mlRiskLevel?: string | null;
}

interface NaviContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  contextData: any;
  setContextData: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const NaviContext = createContext<NaviContextType | undefined>(undefined);

export function NaviProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hi there! I'm Navi, your supply chain co-pilot. I'm currently monitoring your network—is there anything you'd like me to analyze for you?", 
      timestamp: new Date() 
    },
  ]);
  const [contextData, setContextData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <NaviContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      addMessage,
      contextData,
      setContextData,
      isLoading,
      setIsLoading
    }}>
      {children}
    </NaviContext.Provider>
  );
}

export function useNavi() {
  const context = useContext(NaviContext);
  if (context === undefined) {
    throw new Error("useNavi must be used within a NaviProvider");
  }
  return context;
}
