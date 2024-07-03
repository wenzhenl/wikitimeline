import dynamic from "next/dynamic";

const DynamicTimeline = dynamic(
  () => import("./components/MyTimelineComponent"),
  { ssr: false }
);

const HomePage = () => {
  return (
    <div>
      <h1>Timeline</h1>
      <DynamicTimeline />
    </div>
  );
};

export default HomePage;
