"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgePercent } from "lucide-react";

export interface OfferConfig {
  title: string;
  description: string;
  highlightText?: string;
  badgeLabel?: string;
  badgeTagline?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface OfferBannerProps {
  offer: OfferConfig;
}

export default function OfferBanner({ offer }: OfferBannerProps) {
  const {
    title,
    description,
    highlightText,
    badgeLabel = "Limited Time Offer",
    badgeTagline = "Special pricing for early students",
    ctaLabel,
    ctaHref,
  } = offer;

  if (!title.trim()) return null;

  return (
    <section className="relative py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] overflow-hidden">
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-blue-100/40 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/4" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-indigo-100/40 blur-[100px] rounded-full translate-y-1/3 translate-x-1/4" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-2xl px-6 py-8 md:px-12 md:py-10 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-4 border border-white/20">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-2xl bg-white/10 border border-white/30">
                <BadgePercent className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                {badgeLabel}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3">
              {highlightText ? (
                <>
                  <span>{title.replace(highlightText, "")}</span>
                  <span className="ml-1 text-yellow-300">{highlightText}</span>
                </>
              ) : (
                title
              )}
            </h2>

            <p className="text-sm md:text-base lg:text-lg text-blue-50/90 max-w-2xl mb-4">
              {description}
            </p>

            <p className="text-xs md:text-sm text-blue-100/90">
              {badgeTagline}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-stretch md:items-end gap-4">
            <div className="w-full md:w-auto bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-xs sm:text-sm text-blue-50/90">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">This week&apos;s offer</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15">
                  Demo
                </span>
              </div>
              <p>Discount will be automatically applied at checkout.</p>
            </div>

            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold text-sm shadow-lg shadow-blue-900/20 hover:bg-blue-50 transition-colors"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

