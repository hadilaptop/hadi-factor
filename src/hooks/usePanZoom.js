// src/hooks/usePanZoom.js
import { useEffect, useRef } from "react";

export function usePanZoom(step = "preview") {
  const containerRef = useRef(null);

  useEffect(() => {
    if (step !== "preview") return;
    const mainContainer = containerRef.current;
    if (!mainContainer) return;

    mainContainer.style.zoom = "";
    mainContainer.style.transform = "none";
    mainContainer.style.transformOrigin = "0 0";

    const INVOICE_WIDTH = mainContainer.offsetWidth || 1000;

    let currentScale =
      window.innerWidth < INVOICE_WIDTH
        ? window.innerWidth / INVOICE_WIDTH
        : 1;
    let minScale = currentScale;
    let maxScale = 3.5;

    let naturalRect = mainContainer.getBoundingClientRect();
    let expectedScaledWidth = INVOICE_WIDTH * currentScale;
    let desiredLeft = (window.innerWidth - expectedScaledWidth) / 2;
    let defaultTranslateX = desiredLeft - naturalRect.left;

    let translateX = defaultTranslateX;
    let translateY = 0;

    let initialDistance = 0;
    let initialScale = currentScale;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;

    let pinchStartX = 0;
    let pinchStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    let animFrame = null;

    function updateTransform(withTransition = false) {
      if (!mainContainer) return;
      if (withTransition) {
        mainContainer.style.transition =
          "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)";
      } else {
        mainContainer.style.transition = "none";
      }

      mainContainer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale})`;

      const naturalHeight = mainContainer.offsetHeight || 1300;
      const scaledHeight = naturalHeight * currentScale;
      mainContainer.style.marginBottom = `-${naturalHeight - scaledHeight}px`;
    }

    const recalculateInitial = () => {
      if (!mainContainer) return;
      mainContainer.style.transform = "none";
      naturalRect = mainContainer.getBoundingClientRect();
      const w = mainContainer.offsetWidth || 1000;
      currentScale = window.innerWidth < w ? window.innerWidth / w : 1;
      minScale = currentScale;
      expectedScaledWidth = w * currentScale;
      desiredLeft = (window.innerWidth - expectedScaledWidth) / 2;
      defaultTranslateX = desiredLeft - naturalRect.left;
      translateX = defaultTranslateX;
      translateY = 0;
      updateTransform(false);
    };

    recalculateInitial();
    const timer = setTimeout(recalculateInitial, 80);

    const handleResize = () => {
      recalculateInitial();
    };
    window.addEventListener("resize", handleResize);

    const handleTouchStart = (e) => {
      const rect = mainContainer.getBoundingClientRect();

      if (e.touches.length === 2) {
        isDragging = false;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = currentScale;
        initialTranslateX = translateX;
        initialTranslateY = translateY;

        pinchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        initialLeft = rect.left;
        initialTop = rect.top;

        mainContainer.style.transition = "none";
      } else if (e.touches.length === 1) {
        if (currentScale > minScale * 1.05) {
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          initialTranslateX = translateX;
          initialTranslateY = translateY;
          mainContainer.style.transition = "none";
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();

        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleFactor = currentDistance / (initialDistance || 1);
        let newScale = Math.max(
          minScale * 0.7,
          Math.min(initialScale * scaleFactor, maxScale)
        );

        const pinchCurrentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const pinchCurrentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        translateX =
          pinchCurrentX -
          initialLeft +
          initialTranslateX -
          (pinchStartX - initialLeft) * (newScale / initialScale);
        translateY =
          pinchCurrentY -
          initialTop +
          initialTranslateY -
          (pinchStartY - initialTop) * (newScale / initialScale);

        currentScale = newScale;

        if (animFrame) cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(() => updateTransform(false));
      } else if (e.touches.length === 1 && isDragging) {
        if (currentScale > minScale * 1.05) {
          if (e.cancelable) e.preventDefault();

          translateX = initialTranslateX + (e.touches[0].clientX - startX);
          translateY = initialTranslateY + (e.touches[0].clientY - startY);

          if (animFrame) cancelAnimationFrame(animFrame);
          animFrame = requestAnimationFrame(() => updateTransform(false));
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length === 1) {
        if (currentScale > minScale * 1.05) {
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          initialTranslateX = translateX;
          initialTranslateY = translateY;
        }
      } else if (e.touches.length === 0) {
        isDragging = false;
        if (currentScale <= minScale + 0.05) {
          translateX = defaultTranslateX;
          translateY = 0;
          currentScale = minScale;
          updateTransform(true);
        }
      }
    };

    mainContainer.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    mainContainer.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    mainContainer.addEventListener("touchend", handleTouchEnd);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      mainContainer.removeEventListener("touchstart", handleTouchStart);
      mainContainer.removeEventListener("touchmove", handleTouchMove);
      mainContainer.removeEventListener("touchend", handleTouchEnd);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [step]);

  return { containerRef };
}
