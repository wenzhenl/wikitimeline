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
  scale,
  timenavPosition = "bottom",
  timenavHeightPercentage = 50, // Default to 50% for desktop
  timenavMobileHeightPercentage = 50, // Default to 50% for mobile
  onInitialized,
}: MyTimelineComponentProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineInstance, setTimelineInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && timelineRef.current) {

      import("@knight-lab/timelinejs").then(({ Timeline }) => {
        if (timelineInstance && timelineRef.current) {
          timelineRef.current.innerHTML = "";
        }

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
          { title: title, events: events, scale: scale },
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
          // Fix horizontal scrolling in Firefox by patching the _onMouseScroll method
          const isFirefox =
            navigator.userAgent.toLowerCase().indexOf("firefox") > -1;

          if (!isFirefox) {
            return;
          }

          // Get the TimeNav component
          const timelineApi = timeline as any;
          if (!timelineApi._timenav) {
            console.error("Could not access TimeNav component");
            return;
          }

          // Based on the actual TimeNav._onMouseScroll implementation
          // This replicates the exact behavior of the original method but adds Firefox support
          const handleFirefoxScroll = (e: Event) => {
            const wheelEvent = e as ExtendedWheelEvent;

            // Skip vertical scrolling (when not using shift)
            // Only process horizontal scrolls or shift+wheel for side scrolling
            const isHorizontalScroll =
              wheelEvent.shiftKey ||
              Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY);

            if (!isHorizontalScroll) {
              return; // Let normal vertical scrolling work
            }

            // Prevent default browser behavior for this event
            e.preventDefault();
            e.stopPropagation();

            // Get TimeNav component
            const timenav = timelineApi._timenav;
            const slider = timenav._el.slider;

            // Calculate delta using the same approach as TimeNav._onMouseScroll
            let delta = 0;

            // First priority: use deltaX for native horizontal scrolling
            if (Math.abs(wheelEvent.deltaX) > 0) {
              delta = wheelEvent.deltaX * -1; // Invert for natural scrolling
            }
            // Second priority: if shift key is pressed, use deltaY
            else if (wheelEvent.shiftKey && Math.abs(wheelEvent.deltaY) > 0) {
              delta = wheelEvent.deltaY * -1; // Invert for natural scrolling
            }

            // Apply a multiplier to match the sensitivity in other browsers
            delta = delta / 3;

            // Calculate new position
            const currentLeft = parseInt(
              slider.style.left.replace("px", "") || "0"
            );

            // Calculate scroll boundaries - identical to TimeNav code
            const timescale = timenav.timescale;
            const constraint = {
              right: -(timescale.getPixelWidth() - timenav.options.width / 2),
              left: timenav.options.width / 2,
            };

            // Calculate the new position
            let scrollTo = currentLeft + delta;

            // Apply constraints - identical to TimeNav code
            if (scrollTo > constraint.left) {
              scrollTo = constraint.left;
            } else if (scrollTo < constraint.right) {
              scrollTo = constraint.right;
            }

            // Apply the new position directly
            if (scrollTo !== currentLeft) {
              // Make sure timeline slider is not in animation mode
              if (
                slider.className.indexOf("tl-timenav-slider-animate") !== -1
              ) {
                slider.className = "tl-timenav-slider";
              }

              // Set the new position
              slider.style.left = scrollTo + "px";
            }

            return false;
          };

          // Attach our handler to the TimeNav container
          const timenavContainer = document.querySelector(".tl-timenav");
          if (timenavContainer) {
            timenavContainer.addEventListener("wheel", handleFirefoxScroll, {
              passive: false,
            });
          }

          // Also attach to the slider for redundancy
          const slider = document.querySelector(".tl-timenav-slider");
          if (slider) {
            slider.addEventListener("wheel", handleFirefoxScroll, {
              passive: false,
            });
          }

          // Attach to the timeline container as well
          if (timelineRef.current) {
            timelineRef.current.addEventListener(
              "wheel",
              (e: Event) => {
                // Only handle horizontal scrolls at this level
                const wheelEvent = e as ExtendedWheelEvent;
                if (
                  wheelEvent.shiftKey ||
                  Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)
                ) {
                  handleFirefoxScroll(e);
                }
              },
              { passive: false }
            );
          }
        }, 1000); // Increased wait time for timeline to fully initialize
      });
    }

    return () => {
      if (timelineInstance && timelineRef.current) {
        timelineRef.current.innerHTML = "";
      }
    };
  }, [
    title,
    events,
    font,
    scale,
    timenavPosition,
    timenavHeightPercentage,
    timenavMobileHeightPercentage,
    onInitialized,
  ]);

  return <div ref={timelineRef} id="timeline-embed" />;
};

export default MyTimelineComponent;
