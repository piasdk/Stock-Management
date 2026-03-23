"use client";

import Link from "next/link";
import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { QUICK_LINKS, type QuickLink } from "@/lib/quickLinks";

type IconProps = React.SVGAttributes<SVGSVGElement>;

const ArrowRightIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1={5} y1={12} x2={19} y2={12} />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

interface QuickLinksSectionProps {
  links?: QuickLink[];
}

export function QuickLinksSection({ links = QUICK_LINKS }: QuickLinksSectionProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Quick Links</CardTitle>
        <CardDescription>Common actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="group flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-card-foreground/5"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{link.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {link.description}
                  </p>
                  <p className="text-xs text-foreground/50">{link.title}</p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-foreground/40 transition-colors group-hover:text-foreground/70" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

