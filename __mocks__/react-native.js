const React = require('react');

const View = (props) => React.createElement('View', props, props.children);
const Text = (props) => React.createElement('Text', props, props.children);
const TouchableOpacity = (props) => React.createElement('TouchableOpacity', props, props.children);
const ScrollView = (props) => React.createElement('ScrollView', props, props.children);
const StyleSheet = {
  create: (styles) => styles,
  absoluteFill: {},
  absoluteFillObject: {},
};

module.exports = {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
};
