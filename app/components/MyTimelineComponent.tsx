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

        // Fix horizontal scrolling in Firefox
        // Firefox doesn't use wheelDeltaX/Y but uses DOMMouseScroll with the detail property
        // This patch overrides the _onMouseScroll method to properly handle Firefox events
        // Access the internal _timenav property using type assertion since it's not in the public type definitions
        const timelineAny = timeline as any;
        if (timelineAny._timenav) {
          const originalOnMouseScroll = timelineAny._timenav._onMouseScroll;
          timelineAny._timenav._onMouseScroll = function (e: any) {
            let delta = 0;
            const isFirefox =
              navigator.userAgent.toLowerCase().indexOf("firefox") > -1;

            if (!e) {
              e = window.event;
            }
            if (e.originalEvent) {
              e = e.originalEvent;
            }

            // Handle Firefox DOMMouseScroll events - horizontal scroll with shift key
            if (isFirefox && e.detail && e.axis === 1) {
              // Horizontal scroll (with shift key in Firefox)
              delta = -(e.detail * 10) / 3;

              if (e.preventDefault) {
                e.preventDefault();
              }
              e.returnValue = false;

              // Get current position
              const currentLeft = parseInt(
                this._el.slider.style.left.replace("px", "")
              );
              let scrollTo = currentLeft + delta;

              // Apply constraints
              const constraint = {
                right: -(
                  this.timescale.getPixelWidth() -
                  this.options.width / 2
                ),
                left: this.options.width / 2,
              };

              if (scrollTo > constraint.left) {
                scrollTo = constraint.left;
              } else if (scrollTo < constraint.right) {
                scrollTo = constraint.right;
              }

              if (this.animate_css) {
                this._el.slider.className = "tl-timenav-slider";
                this.animate_css = false;
              }

              // Apply the new position
              this._el.slider.style.left = scrollTo + "px";
              return;
            }

            // Use the original handler for other browsers
            return originalOnMouseScroll.call(this, e);
          };
        }

        logger.debug("Timeline component rendered", {
          scale: scale || "human",
          eventsCount: events.length,
          font,
        });

        setTimelineInstance(timeline);
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
