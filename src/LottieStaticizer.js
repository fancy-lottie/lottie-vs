import LottieStaticizerUtil from './LottieStaticizerUtil';
import LottieStaticizerBuilder from './LottieStaticizerBuilder';
import EventEmitter from './EventEmitter';
import { deepCopy, computeImgSqure } from './util';

class LottieStaticizer extends EventEmitter {
  constructor(json, options) {
    super();
    this.source = json;
    this.filename = options.filename || '静态.json'; // 导出的文件名
    this.multipleSize = options.multipleSize || 2; // 图片像素倍数
    this.targetJSON = deepCopy(json); //  深拷贝schema
    this.baseShapes = []; // 需要转换的矢量图形合集
  }
  /**
   * 静态化主流程
   */
  staticize() {
    const width = this.source.w;
    const height = this.source.h;
    const baseLayers = LottieStaticizerUtil.extractBaseLayers(this.source);
    const baseAssets = LottieStaticizerUtil.extractBaseAssets(this.source);

    this.extraceBaseShapeFromAsset(baseAssets);
    this.extraceBaseShapeFromLayer(baseLayers);
    const totalBaseShapesCount = this.baseShapes.length || 0;
    let staticizedBaseShapesCount = 0;

    if (totalBaseShapesCount === 0) {
      console.log('无需要转化的矢量图形');   // 如果没有需要静态化的矢量图形则直接返回原json对象
      LottieStaticizerBuilder.buildJSON(this.targetJSON, this.filename);
    }

    // 使用Lottie绘制矢量图形
    this.baseShapes.forEach((baseShape, index) => {
      LottieStaticizerUtil.convertLayerKeyFrame(baseShape); // 找到每个矢量图形最适合导出为图片的状态【透明度、大小、旋转】并应用到矢量图形上
      // 新增DOM节点用于挂载矢量图形
      const tempContainer = document.createElement('div');
      tempContainer.id = baseShape.id || baseShape.nm;
      document.body.append(tempContainer);
      tempContainer.style.width = (width / 2) * this.multipleSize + 'px';
      tempContainer.style.height = (height / 2) * this.multipleSize + 'px';
      // tempContainer.style.visibility = 'hidden';
      window.bodymovin.loadAnimation({
        container: document.getElementById(baseShape.id || baseShape.nm),
        animationData: baseShape,
        renderer: 'canvas',
        loop: false,
        autoplay: true,
      })
      let canvas = document.querySelectorAll('canvas')[index];
      canvas.style.width = width * this.multipleSize + 'px';
      canvas.style.height = height * this.multipleSize + 'px';
      // 静态化矢量图形
      this.staticizeShape(canvas, baseShape.id || baseShape.nm, baseShape.currentIndex);
    })
    // 监听静态化矢量图形的事件，待所有矢量图形静态化完成导出json
    this.on('staticize', () => {
      staticizedBaseShapesCount++;
      if (staticizedBaseShapesCount === totalBaseShapesCount) {
        this.emit('download');
      }
    });
    // 导出静态化后的json
    this.one('download', () => {
      LottieStaticizerBuilder.buildJSON(this.targetJSON, this.filename);
    })
  }
  /**
   * 向外暴露的接口
   */
  run() {
    this.staticize();
  }
  extraceBaseShapeFromAsset(assets) {
    // 抽取出现在assets中的矢量图形
    assets.forEach(asset => {
      // 过滤掉不可静态化的图层
      asset.layers.filter(layer => LottieStaticizerUtil.layerShouldStaticize(layer)).forEach(layer => {
        if (typeof layer.parent !== 'undefined') {
          const parentIndex = asset.layers.findIndex(item => item.ind === layer.parent);
          if (parentIndex !== -1) {
            const parentLayer = asset.layers[parentIndex];
            let parent = null
            if (parentLayer.ty === 4) {
              parent = {
                ...parentLayer,
                shapes: parentLayer.shapes.map(shape => ({
                  ...shape,
                  it: shape.it.filter(it => ['tr'].includes(it.ty))  // 目前case中只需要type为tr的shape
                })),
              }
            }
            this.baseShapes.push({
              ...asset,
              id: `${asset.id}`,
              currentIndex: layer.ind,
              layers: [layer, parent || parentLayer]
            })
          }
        } else {
          this.baseShapes.push({
            ...asset,
            id: `${asset.id}`,
            currentIndex: layer.ind,
            layers: [layer]
          })
        }
      })
    })
  }
  extraceBaseShapeFromLayer(layers) {
    layers.forEach(layer => {
      if (typeof layer.parent !== 'undefined') {
        const parentIndex = this.targetJSON.layers.findIndex(targetLayer => targetLayer.ind === layer.parent);
        if (parentIndex !== -1) {
          const parentLayer = this.targetJSON.layers[parentIndex];
          parentLayer.isParent = true;
          let parent = null
          if (parentLayer.ty === 4) {
            parent = {
              ...parentLayer,
              shapes: parentLayer.shapes.map(shape => ({
                ...shape,
                it: shape.it ? shape.it.filter(it => ['tr'].includes(it.ty)) : [] // 目前case中只需要type为tr的shape
              })),
            }
          }
          this.baseShapes.push({
            ...this.source,
            currentIndex: layer.ind,
            nm: layer.ind,
            layers: [layer, parent || parentLayer]
          })
        }
      } else {
        this.baseShapes.push({
          ...this.source,
          currentIndex: layer.ind,
          nm: layer.ind,
          layers: [layer]
        })
      }
    })
  }
  /**
   * 静态化矢量图形
   * @param  {} originCanvas
   * @param  {} targetComponentId
   * @param  {} sequence
   */
  staticizeShape(originCanvas, targetComponentId, sequence) {
    const sourceImageUrl = originCanvas.toDataURL(); // 源图片
    const {
      leftOffset,
      rightOffset,
      topOffset,
      bottomOffset
    } = computeImgSqure(originCanvas); // 计算得到图片非空白区域范围
    LottieStaticizerBuilder.buildImage({
      sourceImageUrl,
      sourceLeftOffset: leftOffset,
      sourceReightOffset: rightOffset,
      sourceTopOffset: topOffset,
      sourceBottomOffset: bottomOffset
    }, targetComponentId, sequence, this, this.multipleSize)

    this.one(`buildImage${targetComponentId}_${sequence}`, (imgUrl, imgInfo, id, index) => {
      this.replaceVectorAsset(imgUrl, imgInfo, id, index);
    })
    this.one(`noImage${targetComponentId}_${sequence}`, () => {
      this.emit('staticize');
    })
  }
  /**
    * 使用静态图片替换矢量图层
    * @param  {Object} imgData
    * @param  {Object} targetImageParams
    * @param  {JSON} targetJSON
    * @param  {string} targetComponentId
    * @param  {number} ind
    */
  replaceVectorAsset(imgUrl, targetImageParams, targetComponentId, ind) {
    const assets = this.targetJSON.assets;
    const layers = this.targetJSON.layers;
    const targetAssetIndex = assets.findIndex(item => item.id === targetComponentId);
    const assetId = `image_${targetComponentId}_${ind}`;

    const targetLayerIndex = layers.findIndex(item => item.ind === targetComponentId);


    // 新建资源
    assets.push({
      id: assetId,
      w: targetImageParams.width,
      h: targetImageParams.height,
      u: "",
      p: imgUrl,
      e: 1
    })

    // 更改原先的矢量图层，使其依赖于新建的图片
    if (targetAssetIndex !== -1) {
      const assetsLayerIndex = assets[targetAssetIndex].layers.findIndex(item => item.ind === ind);
      if (assetsLayerIndex !== -1) {
        let assetsLayer = assets[targetAssetIndex].layers[assetsLayerIndex];
        if (!assetsLayer.isParent) {
          assetsLayer.ks.p.k = LottieStaticizerUtil.computeImgPosition(assetsLayer);
          assetsLayer.ks.a.k = [targetImageParams.width / 2, targetImageParams.height / 2, 0];
        }
        assetsLayer.ty = 2;
        assetsLayer.tyName = `image ${assetId}`;
        delete assetsLayer.shapes;
        assets[targetAssetIndex].layers[assetsLayerIndex] = {
          refId: assetId, // refId需在所有属性前，因为在安卓和部分ios系统上对json的解析是逐行进行
          ...assetsLayer,
        }
      }
      this.emit('staticize');
    }

    if (targetLayerIndex !== -1) {
      let assetsLayer = layers[targetLayerIndex];
      // 关键帧应用到shape的情况
      if (!assetsLayer.isParent) {
        if (typeof assetsLayer.ks.p.k[0] !== 'object') {
          // assetsLayer.ks.p.k = LottieStaticizerUtil.computeImgPosition(assetsLayer);
        }
        // assetsLayer.ks.a.k = [targetImageParams.width / 2, targetImageParams.height / 2, 0];
      }
      assetsLayer.ty = 2;
      assetsLayer.tyName = `image ${assetId}`;
      delete assetsLayer.shapes;
      layers[targetLayerIndex] = {
        refId: assetId, // refId需在所有属性前，因为在安卓和部分ios系统上对json的解析是逐行进行
        ...assetsLayer,
      }
      this.emit('staticize');
    }
  }
}

export default LottieStaticizer;