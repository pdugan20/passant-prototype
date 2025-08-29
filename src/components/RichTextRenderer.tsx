import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MentionPill from "./MentionPill";

interface RichTextRendererProps {
  text: string;
  style?: any;
}

interface TextPart {
  type: "text" | "mention";
  content: string;
  mentionType?: "location" | "person" | "restaurant";
}

const parseMentions = (text: string): TextPart[] => {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the mention
    const mentionText = match[1];
    const mentionType = detectMentionType(mentionText);
    parts.push({
      type: "mention",
      content: mentionText,
      mentionType,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return parts;
};

const detectMentionType = (
  text: string,
): "location" | "person" | "restaurant" => {
  const lowerText = text.toLowerCase();

  // Location keywords
  const locationKeywords = [
    "park",
    "street",
    "avenue",
    "plaza",
    "square",
    "center",
    "mall",
    "beach",
    "lake",
    "mountain",
    "downtown",
    "neighborhood",
  ];
  if (locationKeywords.some((keyword) => lowerText.includes(keyword))) {
    return "location";
  }

  // Restaurant keywords
  const restaurantKeywords = [
    "restaurant",
    "cafe",
    "bar",
    "bistro",
    "diner",
    "pizzeria",
    "bakery",
    "grill",
  ];
  if (restaurantKeywords.some((keyword) => lowerText.includes(keyword))) {
    return "restaurant";
  }

  // Default to location for now
  return "location";
};

export default function RichTextRenderer({
  text,
  style,
}: RichTextRendererProps) {
  const parts = parseMentions(text);

  const renderPart = (part: TextPart, index: number) => {
    if (part.type === "mention") {
      return (
        <MentionPill key={index} text={part.content} type={part.mentionType} />
      );
    } else {
      return (
        <Text key={index} style={style}>
          {part.content}
        </Text>
      );
    }
  };

  return (
    <View style={styles.container}>
      {parts.map((part, index) => renderPart(part, index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
});
