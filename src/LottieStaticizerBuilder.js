class LottieStaticizerBuilder {
  /**
   * 生成静态图片
   * @param  {object} imageInfo
   * @param  {string} targetComponentId
   * @param  {string} sequence
   * @param  {object} eventEmitter
   * @param  {number} multipleSize
   */
  static buildImage(source, targetComponentId, sequence, eventEmitter, multipleSize) {
    const {
      sourceImageUrl,
      sourceLeftOffset,
      sourceReightOffset,
      sourceTopOffset,
      sourceBottomOffset,
    } = source || {};
    const width = sourceReightOffset - sourceLeftOffset;
    const height = sourceBottomOffset - sourceTopOffset;
    const sourceImg = new Image();
    sourceImg.src = sourceImageUrl;
    sourceImg.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(sourceImg, sourceLeftOffset, sourceTopOffset, width, height, 0, 0, width, height);

      if (width < 0 || height < 0) {
        eventEmitter.emit(`noImage${targetComponentId}_${sequence}`)
      } else {
        eventEmitter.emit(`buildImage${targetComponentId}_${sequence}`, canvas.toDataURL(), { width: width / multipleSize, height: height / multipleSize }, targetComponentId, sequence)
      }
    }
  }

  /**
   * 导出转换后的JSON
   * @param  {JSON} json
  */
  static buildJSON(json, filename) {
    const downloadLink = document.createElement('a');
    const blob = new Blob([JSON.stringify(json)]);

    downloadLink.download = `${filename}`;
    downloadLink.style.display = 'none';
    downloadLink.href = URL.createObjectURL(blob);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
}

export default LottieStaticizerBuilder;