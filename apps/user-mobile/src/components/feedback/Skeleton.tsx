/**
 * Skeleton Primitive Component
 *
 * Provides calm, animated loading placeholders that match the exact layout
 * of incoming content, preventing cumulative layout shift.
 */

import React, { useEffect, useRef } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className = "",
  style,
}: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacityAnim]);

  return (
    <Animated.View
      className={`bg-neutral-200 ${className}`}
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <Animated.View className="mb-4 rounded-large overflow-hidden border border-default-border bg-surface">
      {/* 16:10 Image Skeleton */}
      <Skeleton width="100%" height={210} borderRadius={0} />

      <Animated.View className="p-4 space-y-2.5">
        {/* Price row */}
        <Animated.View className="flex-row items-center justify-between">
          <Skeleton width={110} height={22} borderRadius={4} />
          <Skeleton width={60} height={16} borderRadius={4} />
        </Animated.View>

        {/* Title row */}
        <Skeleton width="85%" height={18} borderRadius={4} />

        {/* Specs row */}
        <Skeleton width="60%" height={14} borderRadius={4} />

        {/* Location row */}
        <Skeleton width="45%" height={12} borderRadius={4} />
      </Animated.View>
    </Animated.View>
  );
}

export function PropertyHeroSkeleton() {
  return (
    <Animated.View className="mb-6 rounded-large overflow-hidden border border-default-border bg-surface">
      {/* 16:11 Aspect ratio image */}
      <Skeleton width="100%" height={260} borderRadius={0} />

      <Animated.View className="p-5 space-y-3">
        <Skeleton width={140} height={14} borderRadius={4} />
        <Skeleton width="90%" height={26} borderRadius={6} />
        <Skeleton width="55%" height={16} borderRadius={4} />
        <Skeleton width="40%" height={14} borderRadius={4} />
        <Animated.View className="pt-2 flex-row justify-between items-center">
          <Skeleton width={120} height={28} borderRadius={4} />
          <Skeleton width={100} height={36} borderRadius={8} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
