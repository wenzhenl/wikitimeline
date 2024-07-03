import dynamic from "next/dynamic";
import { Event } from "./components/MyTimelineComponent";

const DynamicTimeline = dynamic(
  () => import("./components/MyTimelineComponent"),
  { ssr: false }
);

const HomePage = () => {
  const events: Event[] = [
    {
      start_date: { year: 1881, month: 12, day: 5 },
      text: {
        headline: "先生一岁",
        text: "八月初三，生于浙江绍兴城内东昌坊口。姓周，名树人，字豫才，小名樟寿，至三 十八岁，始用鲁迅为笔名",
      },
      group: "鲁迅",
      background: { url: "https://en.wikipedia.org/wiki/File:LuXun1930.jpg" },
      media: { url: "https://en.wikipedia.org/wiki/Lu_Xun" },
    },
    {
      start_date: { year: 1888 },
      text: { headline: "六岁", text: "是年入塾，从叔祖玉田先生初诵《鉴略》" },
      group: "鲁迅",
      background: { color: "lightblue" },
      media: { url: "https://youtu.be/ZOYrNSC3nQg?si=HwMLpWeh8_oJLfsL" },
    },
    {
      start_date: { year: 1892 },
      text: { headline: "十二岁", text: "正月，往三味书屋从寿镜吾先生怀鉴读" },
      group: "鲁迅",
      background: { color: "lightgreen" },
    },
    {
      start_date: { year: 1893 },
      text: {
        headline: "十三岁",
        text: "三月祖父介孚公丁忧，自北京归。秋，介孚公因事下狱，父伯宜公又抱重病，家产中落，出入于质铺及药店者累年。",
      },
      group: "鲁迅",
    },
  ];

  return (
    <div>
      <h1>鲁迅先生年谱</h1>
      {/* <StaticTimeline events={events} /> */}
      <DynamicTimeline events={events} />
    </div>
  );
};

export default HomePage;
