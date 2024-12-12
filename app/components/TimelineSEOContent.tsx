import { Event } from './MyTimelineComponent';

export default function TimelineSEOContent({ events }: { events: Event[] }) {
  return (
    <div className="sr-only" aria-hidden="true">
      <h2>Timeline Events</h2>
      {events.map((event, index) => (
        <article key={index} className="timeline-event">
          <h3>{event.text.headline}</h3>
          <time>
            {event.start_date.year}
            {event.start_date.month && `-${event.start_date.month}`}
            {event.start_date.day && `-${event.start_date.day}`}
          </time>
          {event.text.text && <p>{event.text.text}</p>}
          {event.group && <div>Category: {event.group}</div>}
          {event.media?.url && (
            <div>
              <a href={event.media.url}>Related media</a>
            </div>
          )}
        </article>
      ))}
    </div>
  );
} 