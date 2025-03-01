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
          // This is a completely new approach that doesn't rely on patching TimelineJS
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

            // Try to locate the timeline navigation container
            // Try multiple selectors to ensure we find the correct element
            // Firefox often needs direct scroll handling
            const possibleSelectors = [
              ".tl-timenav",
              ".tl-timenav-container",
              ".tl-timenav-slider",
              "#timeline-embed",
            ];

            for (const selector of possibleSelectors) {
              const element = timelineRef.current?.querySelector(selector);
              if (element) {
                console.log(`Found timeline element: ${selector}`);

                // Add the wheel event listener directly to this element
                element.addEventListener(
                  "wheel",
                  (event) => {
                    // Cast to WheelEvent to access the wheel-specific properties
                    const e = event as WheelEvent;

                    // Log every wheel event for debugging
                    console.log("Wheel event on " + selector, {
                      shiftKey: e.shiftKey,
                      deltaX: e.deltaX,
                      deltaY: e.deltaY,
                      type: e.type,
                    });

                    // Check if this is a horizontal scroll attempt
                    // Either with shift key or native horizontal wheel
                    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                      console.log("Horizontal scroll detected");

                      // Prevent the default scroll behavior
                      e.preventDefault();

                      // Calculate delta - how much to scroll
                      // For shift+scroll in Firefox, deltaY becomes the horizontal scroll amount
                      const delta = e.shiftKey ? -e.deltaY : -e.deltaX;

                      // Find the slider element
                      const slider = document.querySelector(
                        ".tl-timenav-slider"
                      ) as HTMLElement;
                      if (slider) {
                        // Get current position
                        const currentLeft = parseInt(
                          slider.style.left.replace("px", "") || "0"
                        );

                        // Calculate new position with amplification for better scrolling
                        const scrollTo = currentLeft + delta * 3;

                        // Apply constraints like the original code (get these from TimelineJS)
                        const timelineAny = timeline as any;
                        if (
                          timelineAny._timenav &&
                          timelineAny._timenav.timescale
                        ) {
                          const constraint = {
                            right: -(
                              timelineAny._timenav.timescale.getPixelWidth() -
                              timelineAny._timenav.options.width / 2
                            ),
                            left: timelineAny._timenav.options.width / 2,
                          };

                          let constrainedScrollTo = scrollTo;
                          if (scrollTo > constraint.left) {
                            constrainedScrollTo = constraint.left;
                          } else if (scrollTo < constraint.right) {
                            constrainedScrollTo = constraint.right;
                          }

                          // Apply the new position
                          console.log(
                            `Scrolling from ${currentLeft} to ${constrainedScrollTo}`
                          );
                          slider.style.left = constrainedScrollTo + "px";
                        } else {
                          // If we can't get constraints, just apply the scroll
                          console.log(
                            `Simple scroll from ${currentLeft} to ${scrollTo}`
                          );
                          slider.style.left = scrollTo + "px";
                        }
                      } else {
                        console.log("Could not find slider element");
                      }
                    }
                  },
                  { passive: false }
                );
              }
            }

            // Also add a handler to the document for debugging
            document.addEventListener(
              "wheel",
              (event) => {
                // Cast to WheelEvent to access wheel-specific properties
                const e = event as WheelEvent;

                // Only log if shift key is pressed to avoid console spam
                if (e.shiftKey) {
                  console.log("Document wheel event", {
                    shiftKey: e.shiftKey,
                    target: e.target,
                    deltaX: e.deltaX,
                    deltaY: e.deltaY,
                  });
                }
              },
              { passive: true }
            );
          };

          // Run the setup function
          setupFirefoxScrolling();
        }, 500); // Wait for timeline to initialize
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
