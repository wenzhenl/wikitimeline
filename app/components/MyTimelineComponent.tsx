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
  // Add a ref to store the detected scale to prevent it from changing unexpectedly
  const detectedScaleRef = useRef<string | null>(null);

  // Helper function to determine if cosmological scale is needed
  function requiresCosmologicalScale(events: TimelineJSEvent[]): boolean {
    // Log the events we're checking
    logger.debug("Checking for cosmological scale", {
      eventCount: events?.length || 0,
      hasEvents: !!events && events.length > 0,
      sampleEvent: events?.[0]
        ? {
            hasStartDate: !!events[0].start_date,
            year: events[0].start_date?.year,
            headline: events[0].text?.headline,
          }
        : null,
    });

    // If we've already detected the scale, use that value
    if (detectedScaleRef.current) {
      const needsCosmological = detectedScaleRef.current === "cosmological";
      logger.debug(
        `Using previously detected scale: ${detectedScaleRef.current}`
      );
      return needsCosmological;
    }

    if (!events || events.length === 0) {
      logger.warn("No events provided to check for cosmological scale");
      return false;
    }

    // Check each event for cosmological dates
    const cosmologicalEvents = events.filter((event) => {
      const date = event.start_date;
      if (!date || !date.year) return false;

      const absYear = Math.abs(date.year);
      const needsCosmological =
        date.year < 0 ? absYear > 271821 : absYear > 275760;

      if (needsCosmological) {
        logger.debug("Found cosmological date", {
          year: date.year,
          absYear,
          headline: event.text?.headline,
        });
      }

      return needsCosmological;
    });

    const needsCosmological = cosmologicalEvents.length > 0;

    // Store the detected scale in the ref to prevent it from changing
    detectedScaleRef.current = needsCosmological ? "cosmological" : "human";

    logger.debug("Cosmological scale detection result", {
      needsCosmological,
      cosmologicalEventCount: cosmologicalEvents.length,
      totalEventCount: events.length,
    });

    return needsCosmological;
  }

  useEffect(() => {
    // Reset the detected scale when the events change
    detectedScaleRef.current = null;

    if (typeof window !== "undefined" && timelineRef.current) {
      // Ensure we have events before initializing
      if (!events || events.length === 0) {
        logger.warn("No events provided to MyTimelineComponent");
        return;
      }

      // Log the events we're initializing with
      logger.debug("Initializing timeline with events", {
        eventCount: events.length,
        firstEvent: events[0]
          ? {
              hasStartDate: !!events[0].start_date,
              year: events[0].start_date?.year,
              headline: events[0].text?.headline,
            }
          : null,
      });

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

            logger.debug("Timeline scale determined", {
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

            // Create a deep copy of the events to prevent any modifications
            const eventsCopy = JSON.parse(JSON.stringify(events));

            const timeline = new Timeline(
              timelineRef.current!,
              {
                title: title,
                events: eventsCopy,
                scale: timelineScale,
              },
              options
            );

            // Listen for the timeline's 'loaded' event to notify parent
            (timeline as any).on("loaded", () => {
              logger.debug("Timeline loaded event fired");
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

                logger.debug("Setting up timeline scroll handlers");

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

                // Use a small delay to ensure DOM elements are fully rendered
                setTimeout(() => {
                  try {
                    // Attach scroll handler to timenav elements
                    const timenavContainer =
                      document.querySelector(".tl-timenav");
                    if (timenavContainer) {
                      logger.debug(
                        "Attaching scroll handler to timenav container"
                      );
                      timenavContainer.addEventListener(
                        "wheel",
                        handleUniversalScroll,
                        {
                          passive: false,
                        }
                      );
                    } else {
                      logger.warn("Could not find timenav container element");
                    }

                    // Also attach to the slider for redundancy
                    const slider = document.querySelector(".tl-timenav-slider");
                    if (slider) {
                      logger.debug(
                        "Attaching scroll handler to timenav slider"
                      );
                      slider.addEventListener("wheel", handleUniversalScroll, {
                        passive: false,
                      });
                    } else {
                      logger.warn("Could not find timenav slider element");
                    }

                    // Add event listener to the timeline container but check if the event target is within the timenav area
                    if (timelineRef.current) {
                      logger.debug(
                        "Attaching scroll handler to timeline container"
                      );
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
                            logger.error(
                              "Error in wheel event handler:",
                              error
                            );
                          }
                        },
                        { passive: false }
                      );
                    }

                    logger.debug("Timeline scroll handlers setup complete");
                  } catch (error) {
                    logger.error("Error attaching scroll handlers:", error);
                  }
                }, 500); // Additional delay for DOM elements to be ready
              } catch (error) {
                logger.error(
                  "Error setting up timeline scroll handlers:",
                  error
                );
              }
            }, 2000); // Increased wait time for timeline to fully initialize
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
