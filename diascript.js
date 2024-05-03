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
// setting the `dx` and `dy` properties on its children, indicating their
// position relative to the parent shape. It may also set `width` and/or
// `height` on its children.
//
// `render` is a method of two args, `x` and `y`, indicating the absolute
// position of the shape relative to the diagram. `render` stores its arguments
// as the `x` and `y` properties on the object and returns a list of SVG
// "pseudo-elements" representing the shape based on the shape's `x`, `y`,
// `width`, and `height` properties, along with any other properties supported
// by the particular shape.
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
 * Returns an object with properties from `o` matching names in `ks`.
 */
function select(o, ks) {
  const result = {};
  ks.forEach(k =>
    {
      if (o[k] !== undefined) {
        result[k] = o[k];
      }
    });
  return result;
}


/**
 * Creates an SVG element from the given pseudo element and appends
 * it to the existing SVG element `parent`.
 */
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


class Diagram {


  constructor(shapes, lines) {
    this.shapes = shapes;
    this.lines = lines;
    console.log('diagram ctor', this.shapes);
  }


  renderInto(el) {

    this.el = el;

    this.shapes.forEach(shape =>
      {
        if (shape.x === undefined || shape.y === undefined) {
          console.warn('Top-level shape requires x and y coordinates', shape);
        } else {
          shape.layout();
          shape.render(shape.x, shape.y).forEach(psvg => appendSvgElement(el, psvg));
        }
      });

    console.log("after render", this.shapes);

    // Problem with line rendering:
    // Each line will have to find its `from` and `to` shapes by ID, which currently
    // requires walking down from the top-level shapes, which would be slow for large diagrams.
    // We could walk it once and index by id, but then we wouldn't have the absolute position
    // of the shape.
    //
    // Perhaps shape.layout() should set the _absolute_ position when it lays out children
    //
    if (this.lines) {
      this.lines.forEach(line =>
        {
          line.render(this).forEach(psvg => appendSvgElement(el, psvg));
        });
    }

    return this;
  }


  shrinkWrap() {
    if (!this.el) {
      console.warn('Please call renderInto before calling shrinkWrap');
    } else if (this.shapes.length === 0) {
      console.warn("No shapes, can't shrinkWrap");
    } else {
      const left = Math.max(0, Math.min(...this.shapes.map(shape => shape.x)));
      const top = Math.max(0, Math.min(...this.shapes.map(shape => shape.y)));
      const right = Math.max(...this.shapes.map(shape => shape.x + shape.width));
      const bottom = Math.max(...this.shapes.map(shape => shape.y + shape.height));
      this.el.setAttribute('width', left + right);
      this.el.setAttribute('height', top + bottom);
    }
    return this;
  }

}



class Shape {

  constructor(props) {
    for (const k in props) {
      console.log('prop', k, props[k]);
      this[k.replace('_', '-')] = props[k];
    }
  }

  /**
   * Returns an array of connection points for this shape.
   *
   * Each point is an array [x, y, nx, ny], where (nx, ny) forms a unit vector normal.
   *
   * By default, assumes a rectangular shape and returns the midpoints of each side.
   */
  connectionPoints() {

    const x0 = this.x;
    const x1 = this.x + this.width / 2;
    const x2 = this.x + this.width;

    const y0 = this.y;
    const y1 = this.y + this.height / 2;
    const y2 = this.y + this.height;

    return [
      [x1, y0, 0, -1],
      [x2, y1, 1, 0],
      [x1, y2, 0, 1],
      [x0, y1, -1, 0]
    ];

  }

}

/**
 * Text element.
 */
class Text extends Shape {

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
    super(props);
    this.text = text;
    this.fill = this.fill || 'black';
  }


  /**
   * Returns the SVG attributes for this shape.
   */
  attrs() {
    return select(this, ['x', 'y', 'fill', 'font-weight', 'font-size']);
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
    const attrs = this.attrs();
    for (var k in attrs) {
      textEl.setAttribute(k, attrs[k]);
    }
    textEl.setAttribute('x', 0);
    textEl.setAttribute('y', 0);
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
    this.x = x;
    this.y = y + this.height * 0.8;  // kludge to account for baseline
    return [['text', this.attrs(), this.text]];
  }

}


/**
 * Base class for Vbox and Hbox.  Do not use directly.
 *
 * Vbox and Hbox implement distinct layout() functions
 * but the rest of the implementation is here.
 */
class Box extends Shape {


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
    super(props);
    this.spacing = this.spacing || 0;
    this.padding = this.padding || 0;
    this.fill = this.fill || 'white';
    this.stroke = this.stroke || 'black';
    this['stroke-width'] = this['stroke-width'] || 0;
    this.children = children.map(child =>
      {
        if (typeof(child) === 'string') {
          return new Text({}, child);
        } else {
          return child;
        }
      });
  }

  attrs() {
    const result = select(this, ['x', 'y', 'width', 'height', 'fill', 'rx', 'ry', 'stroke', 'stroke-dasharray', 'stroke-width']);
    result.shapeRendering = 'geometricPrecision';
    return result;
  }

  paddingNumber() {
    if (!this.padding) {
      return 0;
    } else if (typeof(this.padding) === 'number') {
      return this.padding;
    } else {
      return null;
    }
  }

  paddingTop() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else {
      return this.padding[0];
    }
  }

  paddingRight() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.padding.length > 1) {
      return this.padding[1];
    } else {
      return this.padding[0];
    }
  }

  paddingBottom() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.padding.length === 1) {
      return this.padding[0];
    } else if (this.padding.length === 2) {
      return this.padding[0];
    } else if (this.padding.length === 3) {
      return this.padding[2];
    } else {
      return this.padding[2];
    }
  }

  paddingLeft() {
    var padding = this.paddingNumber();
    if (padding !== null) {
      return padding;
    } else if (this.padding.length === 1) {
      return this.padding[0];
    } else if (this.padding.length === 2) {
      return this.padding[1];
    } else if (this.padding.length === 3) {
      return this.padding[1];
    } else {
      return this.padding[3];
    }
  }

  render(x, y) {
    this.x = x;
    this.y = y;
    var result = [['rect', this.attrs()]];
    this.children.forEach(child =>
      {
        result = result.concat(child.render(x + child.dx, y + child.dy));
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
          contentHeight += this.spacing;
        }
        child.layout();
        if (child.width > contentWidth) {
          contentWidth = child.width;
        }
        contentHeight += child.height;
      });

    var extraSpaceV;
    if (this.height === undefined) {
      extraSpaceV = 0;
    } else {
      extraSpaceV = this.height - this.paddingTop() - this.paddingBottom() - contentHeight;
    }

    var topSpace;
    switch (this.valign) {
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
          y += this.spacing;
        }

        var extraSpaceH;
        if (this.width === undefined) {
          extraSpaceH = contentWidth - child.width;
        } else {
          extraSpaceH = this.width - this.paddingLeft() - this.paddingRight() - child.width;
        }

        var leftSpace;
        switch (this.align) {
          case 'left':
            leftSpace = 0;
            break;
          case 'right':
            leftSpace = extraSpaceH;
            break;
          default:
            leftSpace = extraSpaceH / 2;
        }

        child.dx = this.paddingLeft() + leftSpace;
        child.dy = y;

        y += child.height;
      });

    this.height = this.height || (y +  this.paddingBottom());
    this.width = this.width || (contentWidth + this.paddingLeft() + this.paddingRight());

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
          contentWidth += this.spacing;
        }
        child.layout();
        if (child.height > contentHeight) {
          contentHeight = child.height;
        }
        contentWidth += child.width;
      });

    var extraSpaceH;
    if (this.width === undefined) {
      extraSpaceH = 0;
    } else {
      extraSpaceH = this.width - this.paddingLeft() - this.paddingRight() - contentWidth;
    }

    var leftSpace;
    switch (this.align) {
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
          x += this.spacing;
        }

        var extraSpaceV;
        if (this.height === undefined) {
          extraSpaceV = contentHeight - child.height;
        } else {
          extraSpaceV = this.height - this.paddingTop() - this.paddingBottom() - child.height;
        }

        var topSpace;
        switch (this.valign) {
          case 'top':
            topSpace = 0;
            break;
          case 'bottom':
            topSpace = extraSpaceV;
            break;
          default:
            topSpace = extraSpaceV / 2;
        }

        child.dx = x;
        child.dy = this.paddingTop() + topSpace;

        x += child.width;

      });

    this.width = this.width || (x +  this.paddingRight());
    this.height = this.height || (contentHeight + this.paddingTop() + this.paddingBottom());

  }

}



//--- Public API -----------------------------------------------------------------------------

export function diagram(shapes, lines) {
  return new Diagram(shapes, lines);
}

export function text(props, text) {
  return new Text(props, text);
}

export function bold(text) {
  return new Text({ font_weight: 'bold' }, text);
}

export function vbox(props, ...children) {
  return new Vbox(props, ...children);
}

export function hbox(props, ...children) {
  return new Hbox(props, ...children);
}
