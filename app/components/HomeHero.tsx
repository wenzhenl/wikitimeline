export function HomeHero() {
  return (
    <div
      className="text-center w-full max-w-4xl mx-auto pt-16 pb-8 px-4"
      style={{
        textAlign: "center",
        width: "100%",
        maxWidth: "56rem", // matches max-w-4xl
        marginLeft: "auto",
        marginRight: "auto",
        paddingTop: "4rem", // matches pt-16
        paddingBottom: "2rem", // reduced from 4rem to 2rem
        paddingLeft: "1rem", // matches px-4
        paddingRight: "1rem",
      }}
    >
      <h1
        className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500"
        style={{
          fontSize: "3rem", // matches text-5xl
          fontWeight: "700", // matches font-bold
          marginBottom: "1rem", // reduced from 1.5rem to 1rem
        }}
      >
        Transform Wikipedia into Interactive Timelines
      </h1>
      <p
        className="text-xl text-gray-600 dark:text-gray-300 mb-4"
        style={{
          fontSize: "1.25rem", // matches text-xl
          marginBottom: "1rem", // reduced from 2rem to 1rem
        }}
      >
        Instantly convert any Wikipedia article into a beautiful, interactive
        timeline. Perfect for students, researchers, and history enthusiasts.
      </p>
    </div>
  );
}
