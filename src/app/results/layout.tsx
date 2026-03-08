import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FastJudge Results",
    description: "Live sorting results display",
    appleWebApp: {
        title: "Results",
        statusBarStyle: "black-translucent",
    },
    icons: {
        apple: "/results-icon.png",
    },
};

export default function ResultsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
