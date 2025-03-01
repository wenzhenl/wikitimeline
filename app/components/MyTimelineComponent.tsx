"use client";
import { useEffect, useRef, useState } from "react";
import "@knight-lab/timelinejs/dist/css/timeline.css";
import { SITE_CONFIG } from "@/app/config/site";
import { TimelineJSEvent } from "@/app/types/timeline";
import logger from "@/app/utils/logger";

interface MyTimelineComponentProps {
  title?: TimelineJSEvent;
  events: TimelineJSEvent[];
  font: string;
  scale?: "human" | "cosmological";
}

// Extend WheelEvent to include wheelDelta which exists in some browsers
interface ExtendedWheelEvent extends WheelEvent {
  wheelDelta?: number;
}

const MyTimelineComponent = ({
  title,
  events,
  font,
  scale,
}: MyTimelineComponentProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      // Add a startup debug message to verify our code is running
      console.log("Timeline component initializing");

      import("@knight-lab/timelinejs").then(({ Timeline }) => {
        if (timelineInstance && timelineRef.current) {
          timelineRef.current.innerHTML = "";
        }

        const options = {
          initial_zoom: 5,
          zoom_sequence: [
            0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987,
          ],
          hash_bookmark: true,
          ga_measurement_id: SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? "",
          duration: 500,
          marker_height_min: 50,
          timenav_height_percentage: 20,
          timenav_mobile_height_percentage: 20,
          font,
        };

        const timeline = new Timeline(
          timelineRef.current!,
          { title: title, events: events, scale: scale },
          options
        );

        logger.debug("Timeline component rendered", {
          scale: scale || "human",
          eventsCount: events.length,
          font,
        });

        setTimelineInstance(timeline);

        // Wait for timeline to fully initialize and render
        setTimeout(() => {
          console.log("Setting up Firefox scroll handlers");

          // Direct approach: Add scroll handlers to the entire timeline container
          // This is a completely new approach that uses the TimelineJS API for navigation
          const setupFirefoxScrolling = () => {
            const isFirefox =
              navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
            console.log(
              "Browser detection:",
              isFirefox ? "Firefox" : "Other browser"
            );

            if (!isFirefox) {
              console.log("Not Firefox, no need for special handlers");
              return;
            }

            // New approach: Use TimelineJS API for navigation
            const handleFirefoxScroll = (event: Event) => {
              // Cast to our extended WheelEvent type to access wheel-specific properties
              const e = event as ExtendedWheelEvent;

              // Use shift key to determine if this is a horizontal scroll attempt
              const isHorizontalScroll =
                e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

              if (!isHorizontalScroll) {
                return; // Not a horizontal scroll, let the normal handler work
              }

              // Prevent default to avoid page scrolling
              e.preventDefault();
              e.stopPropagation();

              console.log("Horizontal scroll detected in Firefox", {
                shiftKey: e.shiftKey,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                detail: e.detail,
              });

              // Determine scroll direction
              // Check multiple sources for direction information
              let direction = 0;

              // First try deltaX (most reliable for native horizontal scrolling)
              if (e.deltaX !== 0) {
                direction = e.deltaX > 0 ? 1 : -1;
                console.log("Direction determined from deltaX:", direction);
              }
              // Then try deltaY with shift key (for shift+scroll)
              else if (e.shiftKey && e.deltaY !== 0) {
                direction = e.deltaY > 0 ? 1 : -1;
                console.log(
                  "Direction determined from shift+deltaY:",
                  direction
                );
              }
              // Finally try wheel delta or detail as fallback
              else if (e.wheelDelta) {
                direction = e.wheelDelta < 0 ? 1 : -1;
                console.log("Direction determined from wheelDelta:", direction);
              } else if (e.detail) {
                direction = e.detail > 0 ? 1 : -1;
                console.log("Direction determined from detail:", direction);
              }

              // Use the Timeline API to navigate
              if (direction !== 0) {
                try {
                  // Cast to any type to access the API methods
                  const timelineApi = timeline as any;

                  if (direction > 0) {
                    // Scroll right/down -> go to next slide
                    console.log("Navigating to next slide");
                    timelineApi.goToNext();
                  } else {
                    // Scroll left/up -> go to previous slide
                    console.log("Navigating to previous slide");
                    timelineApi.goToPrev();
                  }
                } catch (error) {
                  console.error("Error navigating timeline:", error);
                }
                return false;
              }
            };

            // Try to attach our handler to various elements
            // The goal is to intercept wheel events before they're handled by the library
            const possibleTargets = [
              ".tl-timenav",
              ".tl-timenav-container",
              ".tl-timenav-slider",
              ".tl-timemarker-content-container",
              ".tl-timeaxis-background",
              ".tl-timeaxis",
            ];

            for (const selector of possibleTargets) {
              const elements = document.querySelectorAll(selector);

              elements.forEach((element) => {
                console.log(`Attaching Firefox scroll handler to ${selector}`);
                element.addEventListener("wheel", handleFirefoxScroll, {
                  passive: false,
                });
              });
            }

            // Direct access approach - try to get to the container directly
            if (timelineRef.current) {
              timelineRef.current.addEventListener(
                "wheel",
                (e: Event) => {
                  const wheelEvent = e as ExtendedWheelEvent;
                  if (wheelEvent.shiftKey) {
                    console.log("Container wheel event detected", {
                      target: e.target,
                    });
                    handleFirefoxScroll(e);
                  }
                },
                { passive: false }
              );
            }
          };

          // Run the setup function
          setupFirefoxScrolling();
        }, 1000); // Increased wait time for timeline to fully initialize
      });
    }

    return () => {
      if (timelineInstance && timelineRef.current) {
        timelineRef.current.innerHTML = "";
      }
    };
  }, [title, events, font, scale]);

  return <div ref={timelineRef} id="timeline-embed" />;
};

export default MyTimelineComponent;
