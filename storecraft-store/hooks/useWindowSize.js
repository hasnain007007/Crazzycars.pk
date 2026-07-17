"use client";

import { useState, useEffect } from "react";

export function useWindowSize() {
  // Fixed SSR/client initial values — real size applied in useEffect to avoid hydration mismatch.
  const [windowSize, setWindowSize] = useState({
    width: 1200,
    height: 800,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    ...windowSize,
    isMobile: windowSize.width <= 768,
    isTablet: windowSize.width <= 1024,
    isSmallMobile: windowSize.width <= 480,
  };
}
