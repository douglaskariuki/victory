import defaults from "lodash/defaults";
import uniq from "lodash/uniq";
import isObject from "lodash/isObject";
import React from "react";
import Data from "./data";
import Domain from "./domain";
import { Style } from "victory-core";


export default {
  getData(props) {
    const childComponents = React.Children.toArray(props.children);
    return childComponents.map((child) => {
      const getData = child.type.getData || Data.getData;
      return getData(child.props);
    });
  },

  getDomainFromChildren(props, axis) {
    const childComponents = React.Children.toArray(props.children);
    let domain;
    if (props.domain && (Array.isArray(props.domain) || props.domain[axis])) {
      domain = Array.isArray(props.domain) ? props.domain : props.domain[axis];
    } else {
      const childDomains = childComponents.reduce((prev, component) => {
        const childDomain = component.type.getDomain(component.props, axis);
        return childDomain ? prev.concat(childDomain) : prev;
      }, []);
      domain = childDomains.length === 0 ?
        [0, 1] : [Math.min(...childDomains), Math.max(...childDomains)];
    }
    return Domain.padDomain(domain, props, axis);
  },

  getStackedDomain(props, axis) {
    const propsDomain = Domain.getDomainFromProps(props, axis);
    if (propsDomain) {
      return Domain.padDomain(propsDomain, props, axis);
    }
    const ensureZero = (domain) => {
      return axis === "y" ? [Math.min(...domain, 0), Math.max(... domain, 0)] : domain;
    };
    const childComponents = React.Children.toArray(props.children);
    const getData = (child) => child.type.getData(child.props) || Data.getData(child.props);
    const datasets = childComponents.map((child) => {
      return child.props.children ?
        React.Children.toArray(child.props.children).map((ch) => getData(ch)) : getData(child);
    });
    const dataDomain = ensureZero(Domain.getDomainFromGroupedData(props, axis, datasets));
    return Domain.padDomain(dataDomain, props, axis);
  },

  getColor(calculatedProps, index) {
    // check for styles first
    const { style, colorScale } = calculatedProps;
    if (style && style.data && style.data.fill) {
      return style.data.fill;
    }
    const colors = Array.isArray(colorScale) ?
      colorScale : Style.getColorScale(colorScale);
    return colors[index % colors.length];
  },

  getChildStyle(child, index, calculatedProps) {
    const { style } = calculatedProps;
    const defaultFill = child.type.role === "wrapper" ?
      undefined : this.getColor(calculatedProps, index);
    const childStyle = child.props.style || {};
    const dataStyle = defaults({}, childStyle.data, style.data, {fill: defaultFill});
    const labelsStyle = defaults({}, childStyle.labels, style.labels);
    return {
      parent: style.parent,
      data: dataStyle,
      labels: labelsStyle
    };
  },

  getStringsFromChildren(props, axis) {
    const childComponents = React.Children.toArray(props.children);
    const categoryStrings = childComponents.reduce((prev, component) => {
      const categoryData = Data.getStringsFromCategories(component.props, axis);
      return categoryData ? prev.concat(categoryData) : prev;
    }, []);
    const dataStrings = childComponents.reduce((prev, component) => {
      const stringData = Data.getStringsFromData(component.props, axis);
      return stringData ? prev.concat(stringData) : prev;
    }, []);
    return uniq([...categoryStrings, ...dataStrings]);
  },

  getCategoriesFromProps(props, axis) {
    if (props.categories && isObject(props.categories)) {
      return props.categories[axis];
    }
    return props.categories;
  },

  getCategories(props, axis) {
    return this.getCategoriesFromProps(props, axis) || this.getStringsFromChildren(props, axis);
  }
};
