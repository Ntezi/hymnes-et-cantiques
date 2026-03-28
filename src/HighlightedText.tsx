import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface HighlightedTextProps {
	children: React.ReactNode;
	style?: StyleProp<TextStyle>;
	activeStyle?: StyleProp<TextStyle>;
	isActive?: boolean;
}

const HighlightedText = ({
	children,
	style,
	activeStyle,
	isActive = false,
}: HighlightedTextProps) => (
	<Text style={[style, isActive && activeStyle]}>{children}</Text>
);

export default HighlightedText;
