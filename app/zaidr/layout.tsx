import dynamic from "next/dynamic";

const ArayGlobalAssistant = dynamic(
  () =>
    import("@/components/store/aray-global-assistant").then((module) => ({
      default: module.ArayGlobalAssistant,
    })),
  { ssr: false },
);

export default function ZaidrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ArayGlobalAssistant enabled page="/zaidr" />
    </>
  );
}
