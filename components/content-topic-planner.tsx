"use client";

import { useState } from "react";
import { Check, Clipboard, LoaderCircle, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TopicClusterResult } from "@/lib/ai/topic-cluster";
import { cn } from "@/lib/utils";
import type { Video } from "@/types/video";

const TOPIC_CATEGORIES = [
  {
    name: "Highest Growth Potential",
    target: 0,
    topics: [
      "GSAP Animations",
      "Elementor Widgets",
      "AI + WordPress",
      "Custom WordPress Development",
      "WooCommerce",
      "Next.js + WordPress",
      "WordPress Automation",
      "Creative Effects",
      "Hero Sections",
      "Plugin Tutorials",
    ],
  },
  {
    name: "WordPress Categories",
    target: 0,
    topics: [
      "WordPress",
      "WordPress Beginner Tutorials",
      "WordPress Speed Optimization",
      "WordPress Security",
      "WordPress SEO",
      "WordPress Migration",
      "WordPress Backup & Restore",
      "WordPress Hosting",
      "WordPress Performance",
      "WordPress Automation",
      "WordPress Admin Tips",
    ],
  },
  {
    name: "Elementor Categories",
    target: 0,
    topics: [
      "Elementor",
      "Elementor Widgets",
      "Elementor Containers",
      "Elementor Flexbox",
      "Elementor Popups",
      "Elementor Forms",
      "Elementor Dynamic Content",
      "Elementor Templates",
      "Elementor Theme Builder",
      "Elementor Motion Effects",
      "Elementor Pro Features",
    ],
  },
  {
    name: "WooCommerce Categories",
    target: 0,
    topics: [
      "WooCommerce",
      "WooCommerce Store Setup",
      "WooCommerce Checkout",
      "WooCommerce Product Pages",
      "WooCommerce Cart Optimization",
      "WooCommerce Payment Gateways",
      "WooCommerce Product Filters",
      "WooCommerce Sales Boosters",
      "WooCommerce Memberships",
      "WooCommerce Subscriptions",
      "WooCommerce Automations",
    ],
  },
  {
    name: "High-CTR & GSAP",
    target: 0,
    topics: [
      "GSAP Animations",
      "GSAP Hero Sections",
      "GSAP Scroll Effects",
      "GSAP Sliders",
      "GSAP Text Animations",
      "GSAP Page Transitions",
      "GSAP Product Showcases",
      "GSAP Image Effects",
      "GSAP Background Effects",
      "GSAP ScrollTrigger",
      "GSAP Timelines",
    ],
  },
  {
    name: "Creative Categories",
    target: 0,
    topics: [
      "Creative Effects",
      "Mouse Follow Effects",
      "Image Trail Effects",
      "Hover Effects",
      "Text Reveal Effects",
      "Scroll Animations",
      "Liquid Effects",
      "Glassmorphism",
      "3D Effects",
      "Cursor Effects",
      "Interactive Galleries",
    ],
  },
  {
    name: "Hero Section Categories",
    target: 0,
    topics: [
      "Hero Sections",
      "Animated Hero Sections",
      "Video Hero Sections",
      "AI Hero Sections",
      "GSAP Hero Sections",
      "SaaS Hero Sections",
      "Agency Hero Sections",
      "Portfolio Hero Sections",
    ],
  },
  {
    name: "AI Categories",
    target: 0,
    topics: [
      "AI + WordPress",
      "ChatGPT + WordPress",
      "AI Agents",
      "AI Customer Support",
      "AI Content Generation",
      "AI SEO",
      "AI Website Builder",
      "AI Forms",
      "AI Chatbots",
      "Gemini API Tutorials",
      "OpenAI API Tutorials",
      "AI Development",
      "Next.js AI Apps",
      "AI SaaS Projects",
      "AI Automation Tools",
      "AI Workflow Tutorials",
      "MCP Servers",
      "AI Coding Tools",
      "Cursor AI",
      "Claude Code",
      "Gemini CLI",
      "OpenAI SDK",
    ],
  },
  {
    name: "Plugin Categories",
    target: 0,
    topics: [
      "Plugin Tutorials",
      "Free WordPress Plugins",
      "Premium WordPress Plugins",
      "Hidden WordPress Plugins",
      "Plugin Comparisons",
      "New Plugin Reviews",
      "Plugin Alternatives",
      "Contact Form 7",
      "CF7 Integrations",
      "CF7 Styling",
      "CF7 Multi-Step Forms",
      "CF7 WhatsApp",
      "CF7 Stripe",
      "CF7 reCAPTCHA",
      "CF7 Conditional Logic",
    ],
  },
  {
    name: "Developer Categories",
    target: 0,
    topics: [
      "Custom Development",
      "ACF Tutorials",
      "Custom Post Types",
      "Custom Elementor Widgets",
      "WordPress Plugin Development",
      "WordPress Shortcodes",
      "AJAX Tutorials",
      "REST API Tutorials",
      "Gutenberg Development",
      "Next.js + WordPress",
      "Headless WordPress",
      "Next.js Portfolio",
      "WordPress REST API",
      "WordPress GraphQL",
      "Next.js SaaS",
      "WordPress + AI",
    ],
  },
  {
    name: "Money-Making Categories",
    target: 0,
    topics: [
      "Website Business",
      "Freelancer Tips",
      "Client Projects",
      "Agency Workflows",
      "Website Pricing",
      "Passive Income Websites",
      "SaaS Ideas",
      "Directory Websites",
      "Membership Sites",
      "Booking Websites",
      "Client Portal Systems",
    ],
  },
  {
    name: "Trending 2026",
    target: 0,
    topics: [
      "AI Agents for WordPress",
      "MCP Servers",
      "Headless WordPress",
      "WordPress + Next.js",
      "AI Website Builders",
      "No-Code Automation",
      "Browser Automation",
      "AI Chatbots",
      "Local AI Tools",
      "Open Source AI",
    ],
  },
  {
    name: "WordPress",
    target: 0,
    topics: [
      "How to Install WordPress",
      "WordPress Dashboard Tutorial",
      "How to Create a WordPress Website",
      "WordPress Gutenberg Tutorial",
      "WordPress Block Patterns Tutorial",
      "WordPress Full Site Editing",
      "How to Create a Child Theme",
      "How to Create Custom Post Types",
      "How to Add Custom Fields with ACF",
      "WordPress User Roles Explained",
      "How to Create a Membership Website",
      "How to Create a Directory Website",
      "How to Create a Booking Website",
      "How to Create a Multilingual Website",
      "WordPress SEO Setup",
      "WordPress Security Setup",
      "WordPress Backup Tutorial",
      "WordPress Migration Tutorial",
      "WordPress Staging Site Tutorial",
      "Best WordPress Plugins",
    ],
  },
  {
    name: "WordPress Fixes",
    target: 5,
    topics: [
      "Fix WordPress Not Sending Emails",
      "Fix WordPress Critical Error",
      "Fix White Screen of Death",
      "Fix Database Connection Error",
      "Fix WordPress Login Issues",
      "Reset WordPress Password from Database",
      "Fix Mixed Content Error",
      "Fix SSL Issues",
      "Fix WordPress Slow Website",
      "Fix WordPress Admin Slow",
      "Fix Plugin Conflicts",
      "Fix Theme Issues",
      "Fix WordPress Memory Limit Error",
      "Fix Update Failed Error",
      "Fix Image Upload Errors",
      "Fix Media Library Not Loading",
      "Fix WordPress Menu Not Showing",
      "Fix Homepage Not Updating",
      "Fix Scheduled Posts Not Publishing",
      "Fix WordPress Search Not Working",
      "Fix Broken Permalinks",
      "Fix 404 Errors",
      "Fix REST API Errors",
      "Fix Block Editor Issues",
      "Fix WordPress Migration Errors",
      "Fix SMTP Email Issues",
      "Fix Contact Form Emails",
      "Fix reCAPTCHA Errors",
      "Fix WordPress Cache Issues",
      "Fix Cloudflare Problems",
      "Fix CDN Issues",
      "Fix Mobile Layout Issues",
      "Fix Font Loading Issues",
      "Fix Core Web Vitals",
      "Fix LCP Issues",
      "Fix CLS Issues",
      "Fix Slow TTFB",
      "Fix Login Redirect Loops",
      "Fix Malware Warnings",
      "Fix Wordfence Conflicts",
      "Fix Elementor Not Loading",
      "Fix Plugin Update Failures",
      "Fix PHP Version Errors",
      "Fix Database Corruption",
      "Fix Auto Updates",
      "Fix Backup Restore Errors",
      "Fix WP Cron Issues",
      "Fix XML Sitemap Problems",
      "Fix Google Search Console Errors",
      "Fix Broken Images",
    ],
  },
  {
    name: "WooCommerce",
    target: 2,
    topics: [
      "Add Product Videos to WooCommerce",
      "Product Image Gallery Tutorial",
      "Product Variation Setup",
      "Quantity Pricing",
      "Product Bundles",
      "Product Comparison",
      "Product Wishlist",
      "Quick View Popup",
      "Checkout Customization",
      "One Page Checkout",
      "WooCommerce Subscriptions",
      "WooCommerce Memberships",
      "Dynamic Pricing",
      "Cart Upsells",
      "Cross-Sells",
      "Product Filters",
      "Product Search",
      "Product Sorting",
      "WooCommerce Email Customization",
      "Stripe Setup",
      "PayPal Setup",
      "Shipping Rules",
      "Tax Configuration",
      "Sales Notifications",
      "Product Tabs Customization",
    ],
  },
  {
    name: "Elementor",
    target: 2,
    topics: [
      "Elementor Mega Menu",
      "Elementor Popup Builder",
      "Elementor Loop Grid",
      "Elementor Dynamic Content with ACF",
      "Elementor Header Builder",
      "Elementor Footer Builder",
      "Elementor Login Page",
      "Elementor Registration Form",
      "Elementor Team Section",
      "Elementor Pricing Table",
      "Elementor FAQ Section",
      "Elementor Portfolio Layout",
      "Elementor Business Website",
      "Elementor Landing Page",
      "Elementor AI Features",
    ],
  },
  {
    name: "Creative Effects",
    target: 1,
    topics: [
      "Before & After Slider",
      "Mouse Trail Effect",
      "Card Slider",
      "Product Coverflow Slider",
      "Image Trail Effect",
      "Interactive Gallery",
      "GSAP Scroll Video",
      "Apple Style Hero Section",
      "Netflix Style Video Slider",
      "Interactive Hover Gallery",
    ],
  },
  {
    name: "AI + WordPress",
    target: 0,
    topics: [
      "Build a WordPress Website with AI",
      "Best AI Plugins for WordPress",
      "Elementor AI Tutorial",
      "AI Website Builder for WordPress",
      "Create WordPress Content with AI",
      "AI SEO Tools for WordPress",
      "Add an AI Chatbot to WordPress",
      "Create FAQs with AI in WordPress",
      "Create Landing Pages with AI",
      "Generate Product Descriptions with AI",
      "AI Image Generation for WordPress",
      "AI Forms for WordPress",
      "AI Customer Support for WooCommerce",
      "AI Search for WordPress",
      "AI Translation Plugins for WordPress",
      "AI Security Tools for WordPress",
      "AI Email Marketing for WordPress",
      "Automate WordPress Tasks with AI",
      "Create a WordPress Blog with AI",
      "WordPress AI Plugin Comparison",
    ],
  },
  {
    name: "Plugins",
    target: 0,
    topics: [
      "Best WordPress Plugins",
      "Best Elementor Addons",
      "Best WooCommerce Plugins",
      "Best WordPress Booking Plugin",
      "Best WordPress Membership Plugin",
      "Best WordPress LMS Plugin",
      "Best WordPress Popup Plugin",
      "Best WordPress Slider Plugin",
      "Best WordPress Gallery Plugin",
      "Best WhatsApp Plugin for WordPress",
      "Amelia Booking Plugin Tutorial",
      "BookingPress Plugin Tutorial",
      "Rank Math SEO Tutorial",
      "Yoast SEO Tutorial",
      "Wordfence Security Tutorial",
      "LiteSpeed Cache Tutorial",
      "WP Rocket Tutorial",
      "UpdraftPlus Backup Tutorial",
      "WordPress Migration Plugin Tutorial",
      "Fluent Forms Plugin Tutorial",
    ],
  },
  {
    name: "Contact Form 7",
    target: 0,
    topics: [
      "Contact Form 7 Complete Tutorial",
      "Contact Form 7 Not Sending Emails",
      "Contact Form 7 SMTP Setup",
      "Contact Form 7 WhatsApp Integration",
      "Contact Form 7 Multi-Step Form",
      "Contact Form 7 Conditional Logic",
      "Contact Form 7 File Upload",
      "Contact Form 7 Database Storage",
      "Contact Form 7 Redirect After Submit",
      "Contact Form 7 reCAPTCHA Setup",
      "Contact Form 7 Spam Protection",
      "Contact Form 7 Email Formatting",
      "Contact Form 7 Validation",
      "Contact Form 7 AJAX Issues",
      "Contact Form 7 Mobile Styling",
      "Contact Form 7 Two-Column Layout",
      "Contact Form 7 Popup Form",
      "Contact Form 7 Elementor Integration",
      "Contact Form 7 Success Message",
      "Contact Form 7 Duplicate Submission Fix",
    ],
  },
  {
    name: "Hero Sections",
    target: 0,
    topics: [
      "Elementor Hero Section Tutorial",
      "Responsive Hero Section in Elementor",
      "Full-Screen Hero Section",
      "Hero Section with Video Background",
      "Hero Section with Image Slider",
      "Animated Hero Section",
      "Apple Style Hero Section",
      "SaaS Landing Page Hero Section",
      "Business Website Hero Section",
      "WooCommerce Product Hero Section",
      "Portfolio Hero Section",
      "Agency Hero Section",
      "Split-Screen Hero Section",
      "Hero Section with Contact Form",
      "Hero Section with Popup Video",
      "Hero Section with Lottie Animation",
      "Hero Section with Text Animation",
      "Hero Section with Parallax Effect",
      "Mobile-Friendly Hero Section",
      "AI Website Hero Section",
    ],
  },
] as const;

const FIRST_RECORDING_TOPICS = [
  "Fix WordPress Not Sending Emails",
  "Fix Elementor Not Loading",
  "Contact Form 7 Not Sending Emails",
  "Add Product Videos to WooCommerce",
  "WooCommerce Quantity Pricing",
  "Elementor Mega Menu Tutorial",
  "Reset WordPress Password from Database",
  "Dynamic Content with ACF + Elementor",
  "Fix WooCommerce Checkout Issues",
  "Best WhatsApp Plugin for WordPress",
];

const TOTAL_TOPICS = TOPIC_CATEGORIES.reduce((total, category) => total + category.topics.length, 0);

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Clipboard access was denied."));
}

export function ContentTopicPlanner({ videos }: { videos: Video[] }) {
  const [activeCategory, setActiveCategory] = useState("All Topics");
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(FIRST_RECORDING_TOPICS[0]);
  const [cluster, setCluster] = useState<TopicClusterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const visibleCategories = TOPIC_CATEGORIES.map((category) => ({
    ...category,
    topics: category.topics.filter((topic) => (
      (activeCategory === "All Topics" || activeCategory === category.name)
      && topic.toLowerCase().includes(topicSearch.trim().toLowerCase())
    )),
  })).filter((category) => category.topics.length);

  async function generateRelatedContent() {
    if (!selectedTopic || loading) return;
    const category = TOPIC_CATEGORIES.find((item) => item.topics.some((topic) => topic === selectedTopic))?.name
      || "WordPress";
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/topic-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedTopic,
          category,
          channelName: videos[0]?.channelName || "",
          existingTitles: videos.map((video) => video.title),
          previousSuggestions: cluster
            ? [cluster.primaryVideo.title, ...cluster.relatedContent.map((item) => item.title)]
            : [],
          refresh: Boolean(cluster),
        }),
      });
      const data = await response.json() as { result?: TopicClusterResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || "Related content generation failed.");
      setCluster(data.result);
      toast.success("Related content recommendations generated.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Related content generation failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="planned-topics" className="scroll-mt-24 overflow-hidden">
      <div className="space-y-5 p-4">
        <section className="overflow-hidden rounded-xl border">
          <div className="border-b bg-muted/30 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">All planned topics</p>
                <h3 className="mt-1 text-base font-bold">Select a topic for AI suggestions</h3>
                <p className="mt-1 text-xs text-muted-foreground">{TOTAL_TOPICS} topics available.</p>
              </div>
              <Button onClick={() => void generateRelatedContent()} disabled={!selectedTopic || loading}>
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Building Cluster..." : cluster ? "Get Different Suggestions" : "Suggest Related Content"}
              </Button>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
                placeholder={`Search ${TOTAL_TOPICS} topics...`}
                className="focus-ring h-10 w-full rounded-xl border bg-background pl-10 pr-3 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["All Topics", ...TOPIC_CATEGORIES.map((category) => category.name)].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    activeCategory === category
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary/50",
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[560px] space-y-5 overflow-y-auto p-4">
            {visibleCategories.map((category) => (
              <div key={category.name}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold">{category.name}</h4>
                  <span className="text-[10px] text-muted-foreground">{category.topics.length} topics</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {category.topics.map((topic) => {
                    const selected = topic === selectedTopic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          setSelectedTopic(topic);
                          setCluster(null);
                          setError("");
                        }}
                        className={cn(
                          "focus-ring flex min-h-14 items-start gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition",
                          selected ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <span className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                        )}>
                          {selected ? <Check className="size-3" /> : null}
                        </span>
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!visibleCategories.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No topics match your search.</p>
            ) : null}
          </div>
        </section>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">{error}</div> : null}
        {loading && !cluster ? <div className="h-44 animate-pulse rounded-xl bg-muted" /> : null}

        {cluster ? (
          <section className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">AI content cluster</p>
                <h3 className="mt-1 text-base font-bold">{cluster.primaryVideo.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cluster.primaryVideo.angle}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(
                  [cluster.primaryVideo.title, ...cluster.relatedContent.map((item) => item.title)].join("\n"),
                  "Content cluster",
                )}
              >
                <Clipboard className="size-3.5" /> Copy
              </Button>
            </div>
            <p className="rounded-lg bg-background/80 p-3 text-xs leading-relaxed">{cluster.strategy}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {cluster.relatedContent.map((item, index) => (
                <article key={`${index}-${item.title}`} className="rounded-xl border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase">{item.contentType}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                      item.priority === "High" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
                    )}>
                      {item.priority}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold">{index + 1}. {item.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                </article>
              ))}
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              Generated with {cluster.provider} · {new Date(cluster.generatedAt).toLocaleString()}
            </p>
          </section>
        ) : null}
      </div>
    </Card>
  );
}
