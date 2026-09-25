"use client";

import { useState } from "react";
import { PostDrawer } from "@/components/social/PostDrawer";
import { SocialHistoryPage } from "@/components/social/SocialHistoryPage";

export default function SocialHistoryRoute() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [postId, setPostId] = useState(null);

  return (
    <>
      <SocialHistoryPage
        onOpenPost={(id) => {
          setPostId(id);
          setDrawerOpen(true);
        }}
      />
      <PostDrawer
        open={drawerOpen}
        postId={postId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setDrawerOpen(false)}
      />
    </>
  );
}
