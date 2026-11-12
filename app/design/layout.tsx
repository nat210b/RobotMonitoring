import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System | Robot Monitoring",
  description: "Component, token and machine model preview for the Robot Monitoring interface.",
};

export default function DesignLayout({ children }: LayoutProps<"/design">) {
  return children;
}
