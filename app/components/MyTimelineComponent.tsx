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
  timenavPosition?: "top" | "bottom";
  timenavHeightPercentage?: number;
  timenavMobileHeightPercentage?: number;
  onInitialized?: () => void;
}

// Extend WheelEvent to include wheelDelta which exists in some browsers
interface ExtendedWheelEvent extends WheelEvent {
  wheelDelta?: number;
  wheelDeltaX?: number;
  wheelDeltaY?: number;
}

const MyTimelineComponent = ({
  title,
  events,
  font,
  timenavPosition = "bottom",
  timenavHeightPercentage = 50, // Default to 50% for desktop
  timenavMobileHeightPercentage = 50, // Default to 50% for mobile
  onInitialized,
}: MyTimelineComponentProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  // Helper function to determine if cosmological scale is needed
  function requiresCosmologicalScale(events: TimelineJSEvent[]): boolean {
    return events.some((event) => {
      const date = event.start_date;
      if (!date || !date.year) return false;

      const absYear = Math.abs(date.year);
      return date.year < 0 ? absYear > 271821 : absYear > 275760;
    });
  }

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {
      // Ensure we have events before initializing
      if (!events || events.length === 0) {
        logger.warn("No events provided to MyTimelineComponent");
        return;
      }

      import("@knight-lab/timelinejs")
        .then(({ Timeline }) => {
          try {
            if (timelineInstance && timelineRef.current) {
              timelineRef.current.innerHTML = "";
            }

            // Determine if cosmological scale is needed based on the events
            const needsCosmologicalScale = requiresCosmologicalScale(events);
            const timelineScale = needsCosmologicalScale
              ? "cosmological"
              : "human";

            logger.debug("Timeline scale auto-determined", {
              scale: timelineScale,
              eventsCount: events.length,
              hasAncientDates: needsCosmologicalScale,
            });

            const options = {
              initial_zoom: 5,
              hash_bookmark: true,
              ga_measurement_id: SITE_CONFIG.GOOGLE_ANALYTICS_ID ?? "",
              duration: 500,
              marker_height_min: 50,
              timenav_height_percentage: timenavHeightPercentage,
              timenav_mobile_height_percentage: timenavMobileHeightPercentage,
              timenav_position: timenavPosition,
              font,
            };

            const timeline = new Timeline(
              timelineRef.current!,
              { title: title, events: events, scale: timelineScale },
              options
            );

            // Listen for the timeline's 'loaded' event to notify parent
            (timeline as any).on("loaded", () => {
              if (onInitialized) {
                onInitialized();
              }
            });

            setTimelineInstance(timeline);

            // Wait for timeline to fully initialize and render
            setTimeout(() => {
              try {
                // Get the TimeNav component
                const timelineApi = timeline as any;
                if (!timelineApi || !timelineApi._timenav) {
                  logger.warn("Could not access TimeNav component");
                  return;
                }

                // Universal scroll handler for all browsers
                // Supports horizontal scroll, shift+scroll, and regular vertical scroll in timenav area
                const handleUniversalScroll = (e: Event) => {
                  try {
                    const wheelEvent = e as ExtendedWheelEvent;

                    // Get TimeNav component
                    const timenav = timelineApi._timenav;
                    if (!timenav || !timenav._el || !timenav._el.slider) {
                      logger.warn("TimeNav or slider element not available");
                      return;
                    }

                    const slider = timenav._el.slider;

                    // Calculate delta based on the scroll type
                    let delta = 0;

                    // First priority: use deltaX for native horizontal scrolling
                    if (Math.abs(wheelEvent.deltaX) > 0) {
                      delta = wheelEvent.deltaX * -1; // Invert for natural scrolling
                    }
                    // Second priority: if shift key is pressed, use deltaY
                    else if (
                      wheelEvent.shiftKey &&
                      Math.abs(wheelEvent.deltaY) > 0
                    ) {
                      delta = wheelEvent.deltaY * -1; // Invert for natural scrolling
                    }
                    // Third priority: use regular vertical scroll in timenav area
                    else if (Math.abs(wheelEvent.deltaY) > 0) {
                      delta = wheelEvent.deltaY * -1; // Invert for natural scrolling
                    }

                    // If no meaningful scroll detected, exit
                    if (delta === 0) {
                      return;
                    }

                    // Prevent default browser behavior for this event
                    e.preventDefault();
                    e.stopPropagation();

                    // Apply a multiplier to match the sensitivity
                    delta = delta / 3;

                    // Calculate new position
                    const currentLeft = parseInt(
                      slider.style.left
                        ? slider.style.left.replace("px", "")
                        : "0"
                    );

                    // Calculate scroll boundaries
                    if (
                      !timenav.timescale ||
                      typeof timenav.timescale.getPixelWidth !== "function"
                    ) {
                      logger.warn("TimeNav timescale not available");
                      return;
                    }

                    const timescale = timenav.timescale;
                    const constraint = {
                      right: -(
                        timescale.getPixelWidth() -
                        timenav.options.width / 2
                      ),
                      left: timenav.options.width / 2,
                    };

                    // Calculate the new position
                    let scrollTo = currentLeft + delta;

                    // Apply constraints
                    if (scrollTo > constraint.left) {
                      scrollTo = constraint.left;
                    } else if (scrollTo < constraint.right) {
                      scrollTo = constraint.right;
                    }

                    // Apply the new position directly
                    if (scrollTo !== currentLeft) {
                      // Make sure timeline slider is not in animation mode
                      if (
                        slider.className.indexOf(
                          "tl-timenav-slider-animate"
                        ) !== -1
                      ) {
                        slider.className = "tl-timenav-slider";
                      }

                      // Set the new position
                      slider.style.left = scrollTo + "px";
                    }

                    return false;
                  } catch (error) {
                    logger.error("Error in scroll handler:", error);
                    return false;
                  }
                };

                // Check if an element is within the timenav area
                const isInTimenavArea = (element: HTMLElement): boolean => {
                  return element.closest(".tl-timenav") !== null;
                };

                // Attach scroll handler to timenav elements
                const timenavContainer = document.querySelector(".tl-timenav");
                if (timenavContainer) {
                  timenavContainer.addEventListener(
                    "wheel",
                    handleUniversalScroll,
                    {
                      passive: false,
                    }
                  );
                }

                // Also attach to the slider for redundancy
                const slider = document.querySelector(".tl-timenav-slider");
                if (slider) {
                  slider.addEventListener("wheel", handleUniversalScroll, {
                    passive: false,
                  });
                }

                // Add event listener to the timeline container but check if the event target is within the timenav area
                if (timelineRef.current) {
                  timelineRef.current.addEventListener(
                    "wheel",
                    (e: Event) => {
                      try {
                        const target = e.target as HTMLElement;

                        // Only handle scrolls when in the timenav area
                        if (isInTimenavArea(target)) {
                          handleUniversalScroll(e);
                        }
                      } catch (error) {
                        logger.error("Error in wheel event handler:", error);
                      }
                    },
                    { passive: false }
                  );
                }
              } catch (error) {
                logger.error(
                  "Error setting up timeline scroll handlers:",
                  error
                );
              }
            }, 1500); // Increased wait time for timeline to fully initialize
          } catch (error) {
            logger.error("Error initializing timeline:", error);
          }
        })
        .catch((error) => {
          logger.error("Error importing Timeline library:", error);
        });
    }

    return () => {
      if (timelineInstance && timelineRef.current) {
        try {
          timelineRef.current.innerHTML = "";
        } catch (error) {
          logger.error("Error cleaning up timeline:", error);
        }
      }
    };
  }, [
    title,
    events,
    font,
    timenavPosition,
    timenavHeightPercentage,
    timenavMobileHeightPercentage,
    onInitialized,
  ]);

  return <div ref={timelineRef} id="timeline-embed" />;
};

export default MyTimelineComponent;
