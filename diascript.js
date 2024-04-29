/**
 * Text element.
 */
class Text {

  constructor(props, text) {
    this.props = props;
    this.text = text;
  }

  attrs(x, y) {
    return {
      x: x + (this.x || 0),
      y: y + (this.y || 0) + (this.height || 0) * 0.8,  // kludge to account for baseline
      fill: this.props.fill || 'black',
      'font-weight': this.props.font_weight || 'normal',
      'font-size': this.props.font_size || 16,
    };
  }

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

  layout() {
    const bbox = this.bbox();
    this.width = bbox.width;
    this.height = bbox.height;
  }

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
