//
// DiaScript
//
// A DiaScript diagram consists of an array of shapes and an array of lines.
//
// A shape is a JavaScript object that implements two methods: `layout` and `render`.
//
// `layout` is a no-args method that calculates the `width` and `height`
// properties of the shape. If the shape is a container for other shapes,
// `layout` is responsible for calling `layout` on its children and also for
// setting the `x` and `y` properties on its children (it may also set `width`
// and/or `height` on its children.)
//
// `render` is a method of two args, `x` and `y`, that returns a list of SVG
// "pseudo-elements" representing the shape based on the shape's `x`, `y`, `width`,
// and `height` properties, along with any other properties supported by the
// particular shape.
//
// A pseudo-element is a JavaScript array with two or three elements, `tag`,
// `attrs`, and `text`, representing an SVG element.
//
// Each top-level shape must have either `x` and `y` properties set, indicating
// the position of the top-level corner of the shape within the SVG element.
//
// Alternatively, the top-level shape may have an `align` attribute that is an
// array of three attributes: `id`, `dx`, and `dy`.  DiaScript will position
// the shape relative to another shape with ID `id`, with this shape's center
// being positioned at offset `(dx, dy)` relative to the center of the other shape.
//
// A line is a JavaScript object with the properties `from` and `to` that
// implements a `render` method.  `from` and `to` each contain the ID of a
// shape that the line joins. `render` takes two args, `from` and `to`, each of
// which is an array of two numbers, `x` and `y`, indicating the position of an
// end of the line.  `render` returns an array of SVG pseudo-elements based on
// `from` and `to`, as well as any other properties supported by that line type.
//

/**
 * Text element.
 */
class Text {

  /**
   * Creates a text element.  Text wrapping is not supported.  Instead, you
   * can add multiple Text objects into a Vbox.
   *
   * @param {object} props
   * @param {string} [props.fill=black] - Color with which to draw the text.
   * @param {string} [props.font_weight=normal] - Font weight, e.g. 'bold'.
   * @param {string} [props.font_size=16] - Font size in SVG units.
   * @param {string} text - Text to render.
   */
  constructor(props, text) {
    this.props = props;
    this.text = text;
  }


  /**
   * Returns the SVG attributes for this element, applying defaults as required.
   *
   * @param {number} x - X-coordinate of the left edge of the shape.
   * @param {number} y - Y-coordinate of the top edge of the shape.
   */
  attrs(x, y) {
    return {
      x: x + (this.x || 0),
      y: y + (this.y || 0) + (this.height || 0) * 0.8,  // kludge to account for baseline
      fill: this.props.fill || 'black',
      'font-weight': this.props.font_weight || 'normal',
      'font-size': this.props.font_size || 16,
    };
  }


  /**
   * Returns the bounding box for this text, which is an object with `width`
   * and `height` properties.
   *
   * Uses a hidden SVG element on the page to render and measure the text
   * element.
   */
  bbox() {
    var measureSvg = document.getElementById('measureSvg');
    if (!measureSvg) {
      measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      measureSvg.setAttribute('id', 'measureSvg');
      measureSvg.setAttribute('width', 0);
      measureSvg.setAttribute('height', 0);
      document.body.appendChild(measureSvg);
    }
    while (measureSvg.firstChild) {
      measureSvg.removeChild(measureSvg.lastChild);
    }
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    measureSvg.appendChild(textEl);
    const attrs = this.attrs(0, 0);
    for (var k in attrs) {
      textEl.setAttribute(k, attrs[k]);
    }
    const textNode = document.createTextNode(this.text);
    textEl.appendChild(textNode);
    return textEl.getBBox();
  }


  /**
   * Sets the width and height properties of the shape.
   */
  layout() {
    const bbox = this.bbox();
    this.width = bbox.width;
    this.height = bbox.height;
  }


  /**
   * Returns an array of pseudo-SVG elements for this shape.
   */
  render(x, y) {
    return [['text', this.attrs(x, y), this.text]];
  }

}


/**
 * Base class for Vbox and Hbox.  Do not use directly.
 *
 * Vbox and Hbox implement distinct layout() functions
 * but the rest of the implementation is here.
 */
class Box {


  /**
   * Creates a box shape.
   *
   * @param {object} props
   * @param {string} [props.align=center] - Horizontal alignment of content: 'left', 'center', 'right'.  Ignored unless `props.width` is set.
   * @param {string} [props.fill=white] - Fill color for the shape.
   * @param {number} [props.height] - Height of the box. By default, calculated from content and padding.
   * @param {(number|number[])} [props.padding=0] - Padding inside the box, in SVG units.
   * Padding specified as an array follows the CSS standard:
   * 10 or [10] - Set all padding to 10.
   * [10, 20] - Set vertical padding to 10 and horizontal padding to 20.
   * [10, 20, 30] - Set top padding to 10, horizontal padding to 20, and bottom padding to 30.
   * [10, 20, 30, 40] - Set top padding to 10, right padding to 20, bottom padding to 30, and left padding to 40.
   * @param {string} [props.stroke=black] - Stroke color for the shape.
   * @param {number} [props.stroke_width=1] - Stroke width for the shape.
   * @param {number} [props.width] - Width of the box. By default, calculated from content and padding.
   * @param {string} [props.valign=middle] - Vertical alignment of content: 'top', 'middle', 'bottom'.  Ignored unless `props.height` is set.
   */
  constructor(props, ...children) {
    this.props = props;
    this.children = children;
  }

  attrs(x, y) {
    return {
      x: x + (this.props.x || this.x || 0),
      y: y + (this.props.y || this.y || 0),
      width: this.width,
      height: this.height,
      fill: this.props.fill || 'white',
      stroke: this.props.stroke || 'black',
      'stroke-width': this.props.stroke_width || 0,
      'shapeRendering': 'geometricPrecision',
    };
  }

  paddingNumber() {
    if (!this.props.padding) {
      return 0;
    } else if (typeof(this.props.padding) === 'number') {
      return this.props.padding;
    } else {
      return null;
    }
  }

  paddingTop() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else {
      return this.props.padding[0];
    }
  }

  paddingRight() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.props.padding.length > 1) {
      return this.props.padding[1];
    } else {
      return this.props.padding[0];
    }
  }

  paddingBottom() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.props.padding.length === 1) {
      return this.props.padding[0];
    } else if (this.props.padding.length === 2) {
      return this.props.padding[0];
    } else if (this.props.padding.length === 3) {
      return this.props.padding[2];
    } else {
      return this.props.padding[2];
    }
  }

  paddingLeft() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.props.padding.length === 1) {
      return this.props.padding[0];
    } else if (this.props.padding.length === 2) {
      return this.props.padding[1];
    } else if (this.props.padding.length === 3) {
      return this.props.padding[1];
    } else {
      return this.props.padding[3];
    }
  }

  render(x, y) {
    const attrs = this.attrs(x, y);
    var result = [['rect', attrs]];
    this.children.forEach(child =>
      {
        result = result.concat(child.render(attrs.x, attrs.y));
      });
    return result;
  }

}


/**
 * Box that stacks its children vertically.
 */
class Vbox extends Box {

  constructor(props, ...children) {
    super(props, ...children);
  }

  layout() {

    var contentWidth = 0;
    var contentHeight = 0;
    this.children.forEach((child, i) =>
      {
        if (i > 0) {
          contentHeight += this.props.spacing || 0;
        }
        child.layout();
        if (child.width > contentWidth) {
          contentWidth = child.width;
        }
        contentHeight += child.height;
      });

    var extraSpaceV;
    if (this.props.height === undefined) {
      extraSpaceV = 0;
    } else {
      extraSpaceV = this.props.height - this.paddingTop() - this.paddingBottom() - contentHeight;
    }

    var topSpace;
    switch (this.props.valign) {
      case 'top':
        topSpace = 0;
        break;
      case 'bottom':
        topSpace = extraSpaceV;
        break;
      default:
        topSpace = extraSpaceV / 2;
    }

    var y = this.paddingTop() + topSpace;
    this.children.forEach((child, i) =>
      {
        if (i > 0) {
          y += this.props.spacing || 0;
        }

        var extraSpaceH;
        if (this.props.width === undefined) {
          extraSpaceH = contentWidth - child.width;
        } else {
          extraSpaceH = this.props.width - this.paddingLeft() - this.paddingRight() - child.width;
        }

        var leftSpace;
        switch (this.props.align) {
          case 'left':
            leftSpace = 0;
            break;
          case 'right':
            leftSpace = extraSpaceH;
            break;
          default:
            leftSpace = extraSpaceH / 2;
        }

        child.x = this.paddingLeft() + leftSpace;
        child.y = y;

        y += child.height;
      });

    this.height = this.props.height || (y +  this.paddingBottom());
    this.width = this.props.width || (contentWidth + this.paddingLeft() + this.paddingRight());

  }

}



/**
 * Box that stacks its children horizontally.
 */
class Hbox extends Box {

  constructor(props, ...children) {
    super(props, ...children);
  }

  layout() {

    var contentWidth = 0;
    var contentHeight = 0;
    this.children.forEach((child, i) =>
      {
        if (i > 0) {
          contentWidth += this.props.spacing || 0;
        }
        child.layout();
        if (child.height > contentHeight) {
          contentHeight = child.height;
        }
        contentWidth += child.width;
      });

    var extraSpaceH;
    if (this.props.width === undefined) {
      extraSpaceH = 0;
    } else {
      extraSpaceH = this.props.width - this.paddingLeft() - this.paddingRight() - contentWidth;
    }

    var leftSpace;
    switch (this.props.align) {
      case 'left':
        leftSpace = 0;
        break;
      case 'right':
        leftSpace = extraSpaceH;
        break;
      default:
        leftSpace = extraSpaceH / 2;
    }

    var x = this.paddingLeft() + leftSpace;
    this.children.forEach((child, i) =>
      {
        if (i > 0) {
          x += this.props.spacing || 0;
        }

        var extraSpaceV;
        if (this.props.height === undefined) {
          extraSpaceV = contentHeight - child.height;
        } else {
          extraSpaceV = this.props.height - this.paddingTop() - this.paddingBottom() - child.height;
        }

        var topSpace;
        switch (this.props.valign) {
          case 'top':
            topSpace = 0;
            break;
          case 'bottom':
            topSpace = extraSpaceV;
            break;
          default:
            topSpace = extraSpaceV / 2;
        }

        child.x = x;
        child.y = this.paddingTop() + topSpace;

        x += child.width;

      });

    this.width = this.props.width || (x +  this.paddingRight());
    this.height = this.props.height || (contentHeight + this.paddingTop() + this.paddingBottom());

  }

}



function appendSvgElement(parent, [ tag, attrs, ...children ]) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  parent.appendChild(el);
  for (var k in attrs) {
    el.setAttribute(k, attrs[k]);
  }
  children.forEach(child =>
    {
      if (typeof(child) === 'string') {
        const textNode = document.createTextNode(child);
        el.appendChild(textNode);
      } else {
        appendSvgElement(el, child);
      }
    });
}


function renderInto(parent, x, y, shape) {
  shape.layout();
  shape.render(x, y).forEach(psvg => appendSvgElement(parent, psvg));
}
