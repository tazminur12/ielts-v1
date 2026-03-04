import CTA from "../components/Home/CTA";
import Features from "../components/Home/Features";
import Hero from "../components/Home/Hero";
import Carousel from "../components/Home/Carousel";
import OfferBanner, { type OfferConfig } from "../components/Home/OfferBanner";
import SuccessStories from "../components/Home/SuccessStories";

const demoOffer: OfferConfig = {
  title: "Get 20% off your first full IELTS mock test",
  highlightText: "20% off",
  description:
    "Try a complete, exam-style IELTS mock test with instant AI feedback on your Writing and Speaking. Perfect for understanding your real band level before exam day.",
  badgeLabel: "Launch Offer",
  badgeTagline: "Demo data – later will come from admin panel",
  ctaLabel: "Start mock test",
  ctaHref: "/exam",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <Hero />
      <Carousel />
      <OfferBanner offer={demoOffer} />
      <Features />
      <SuccessStories />
      <CTA />
    </main>
  );
}
