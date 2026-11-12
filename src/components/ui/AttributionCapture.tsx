"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Invisible: remembers which ad or site sent the visitor, for the "where did this enquiry come from" report in the CRM. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
