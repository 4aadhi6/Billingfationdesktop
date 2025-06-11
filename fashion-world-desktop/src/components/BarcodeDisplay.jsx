import React, { useRef, useEffect } from 'react';

const BarcodeDisplay = ({ productId, price, shopName }) => {
  const svgRef = useRef(null);
  const BARCODE_HEIGHT = 40;
  const BARCODE_WIDTH_MULTIPLIER = 1.5;

  useEffect(() => {
    if (svgRef.current && window.JsBarcode) {
      try {
        window.JsBarcode(svgRef.current, productId, {
          format: "CODE128",
          lineColor: "#000000",
          background: "#FFFFFF",
          width: BARCODE_WIDTH_MULTIPLIER,
          height: BARCODE_HEIGHT,
          displayValue: true,
          fontOptions: "bold",
          fontSize: 10,
          textMargin: 0,
          margin: 5,
        });
      } catch (e) {
        console.error("JsBarcode error for ID:", productId, e);
        if (svgRef.current) {
          svgRef.current.innerHTML = `<text x="10" y="20" fill="red">Error for ${productId}</text>`;
        }
      }
    }
  }, [productId]);

  const handleDownloadBarcode = async () => {
    if (!svgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shopNameText = `${shopName}`;
    const priceText = `₹${price.toFixed(2)}`;
    const shopNameFontSize = 14;
    const priceFontSize = 16;
    const textPadding = 5;
    const extraSpaceForIdText = 15;

    const svgRect = svgRef.current.getBBox();
    const barcodeVisualWidth = svgRect.width || (productId.length * 8 * BARCODE_WIDTH_MULTIPLIER);
    const barcodeVisualHeight = svgRect.height || (BARCODE_HEIGHT + extraSpaceForIdText);

    const canvasWidth = Math.max(barcodeVisualWidth + 2 * textPadding, 200);
    const canvasHeight = shopNameFontSize + barcodeVisualHeight + priceFontSize + 4 * textPadding;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = `bold ${shopNameFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(shopNameText, canvas.width / 2, shopNameFontSize + textPadding);

    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const img = new Image();
    img.onload = async () => {
      const barcodeX = (canvas.width - img.width) / 2;
      const barcodeY = shopNameFontSize + 2 * textPadding;
      ctx.drawImage(img, barcodeX, barcodeY);

      ctx.fillStyle = '#000000';
      ctx.font = `bold ${priceFontSize}px Arial`;
      ctx.textAlign = 'center';
      const priceY = barcodeY + img.height + priceFontSize + textPadding;
      ctx.fillText(priceText, canvas.width / 2, priceY);

      const pngUrl = canvas.toDataURL('image/png');
      const defaultPath = `${shopName.replace(/\s+/g, '_')}-${productId}-Price${price.toFixed(0)}.png`;

      // Use the Electron API exposed via the preload script
      if (window.electronAPI) {
        const result = await window.electronAPI.saveBarcode({ pngDataUrl: pngUrl, defaultPath });
        if (result.success) {
          console.log(`Barcode saved to: ${result.path}`);
        } else {
          console.log(`Barcode save failed: ${result.reason}`);
        }
      } else {
        alert("Desktop integration not found. Cannot save file.");
      }
    };
    img.src = svgDataUrl;
  };

  return (
    <div className="barcode-area flex flex-col items-center p-2 bg-white rounded shadow text-black my-1 max-w-xs mx-auto">
      <p className="shop-name text-xs font-semibold mb-0.5">{shopName}</p>
      <svg ref={svgRef} className="barcode-svg" preserveAspectRatio="xMidYMin meet"></svg>
      <p className="price text-sm font-bold mt-0.5">₹{price.toFixed(2)}</p>
      <button
        onClick={handleDownloadBarcode}
        className="mt-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold py-1 px-3 rounded-md transition duration-150"
        aria-label={`Download barcode for product ID ${productId}`}
      >
        Download Barcode
      </button>
    </div>
  );
};

export default BarcodeDisplay;
