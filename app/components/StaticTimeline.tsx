const StaticTimeline = ({ events }) => {
  return (
    <div>
      {events.map((event, index) => (
        <div key={index} className={`event ${event.group}`}>
          <h2>{event.text.headline}</h2>
          <p>{event.text.text}</p>
          <p>{event.start_date.year}</p>
        </div>
      ))}
    </div>
  );
};

export default StaticTimeline;
