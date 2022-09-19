"use strict";
class SYCycleImage {
    constructor(id, config = {
        width: 0,
        height: 0,
        dpi: 1,
        distance: 10,
        maxThread: 6,
        defaultIndex: 0,
    }) {
        this.timer = null;
        this.destroy = () => { };
        this.running = 0;
        this.list = [];
        this.imagesArr = [];
        this.config = { width: 0, height: 0 };
        this.maxThread = 6;
        this.gl = null;
        this.overImageList = [];
        this.startPoint = 0;
        this.distance = 1;
        this.curDeg = 0;
        this.maxDeg = 0;
        this.mouseDown = false;
        this.dpi = 1;
        this.distance = config.distance ?? 1;
        this.maxThread = config.maxThread ?? 6;
        this.curDeg = config.defaultIndex ?? 0;
        let dpi = config.dpi ?? 1;
        this.dpi = dpi;
        this.config = { width: config.width * dpi, height: config.height * dpi };
        this.initElement(id);
    }
    initElement(id) {
        const { width, height } = this.config;
        let father = document.getElementById(id);
        let container = document.createElement("div");
        container.className = "canvas-wrap";
        let canvasElement = document.createElement("canvas");
        canvasElement.className = "canvas-cycle";
        canvasElement.setAttribute("id", "canvas-cycle");
        canvasElement.style.width = (this.config.width / this.dpi) + 'px';
        canvasElement.style.height = (this.config.height / this.dpi) + 'px';
        canvasElement.width = width;
        canvasElement.height = height;
        container.appendChild(canvasElement);
        if (father) {
            father.appendChild(container);
        }
        this.gl = canvasElement.getContext("2d");
        container.ontouchstart = (e) => {
            this.touchstart(e);
        };
        container.ontouchmove = (e) => {
            this.touchmove(e);
        };
        container.onmousedown = (e) => {
            this.mouseDown = true;
            this._touchstart(e.clientX);
        };
        container.onmousemove = (e) => {
            if (!this.mouseDown) {
                return;
            }
            this._touchmove(e.clientX);
        };
        container.onmouseup = () => {
            this.mouseDown = false;
        };
        this.destroy = () => {
            this.list = [];
            container.remove();
        };
    }
    touchstart(e) {
        this._touchstart(e.touches[0].clientX);
    }
    _touchstart(startPoint) {
        this.startPoint = startPoint;
    }
    touchmove(e) {
        clearTimeout(this.timer);
        this._touchmove(e.touches[0].clientX);
    }
    _touchmove(tempPoint) {
        if (tempPoint - this.startPoint > this.distance) {
            this.drawImg("right");
            this.startPoint = tempPoint;
        }
        else if (tempPoint - this.startPoint < -this.distance) {
            this.drawImg("left");
            this.startPoint = tempPoint;
        }
        this.timer = setTimeout(() => {
            let item = this.overImageList[this.curDeg];
            this.addDownloadTask(item);
        }, 500);
    }
    drawImg(type) {
        const width = this.config.width;
        const height = this.config.height;
        if (this.gl) {
            this.gl.clearRect(0, 0, width, height);
        }
        if (type == "right") {
            if (this.curDeg > 0) {
                this.curDeg--;
            }
            else {
                this.curDeg = this.maxDeg;
            }
        }
        else if (type == "left") {
            if (this.curDeg < this.maxDeg) {
                this.curDeg++;
            }
            else {
                this.curDeg = 0;
            }
        }
        let images = this.imagesArr[this.curDeg];
        if (!images) {
            return;
        }
        images.forEach((item) => {
            if (this.gl && item) {
                this.gl.drawImage(item, 0, 0, item.width, item.height, 0, 0, this.config.width, this.config.height);
            }
        });
    }
    updateImages(images) {
        if (images?.length) {
            let isArr = images?.[0] instanceof Array;
            let arr = images;
            if (!isArr) {
                arr = [images];
            }
            this.maxDeg = (arr?.[0]?.length - 1);
            this.overImageList = arr[0].map((col, i) => arr.map(row => row[i]));
        }
        this.initCurrentImage();
    }
    initCurrentImage() {
        this.list = [];
        this.imagesArr = Array.from({ length: this.overImageList.length }, () => undefined);
        let item = this.overImageList[this.curDeg];
        this.addDownloadTask(item);
        this.list = [...this.overImageList];
        this.launch();
    }
    loadPromise(arr, cb) {
        let p = arr.map(item => item());
        Promise.all(p).then(res => {
            cb(res);
        });
    }
    launchImage(arr) {
        this.loadPromise(arr, (imgs) => {
            if (imgs && imgs[0]) {
                let img = imgs[0];
                let str = img.currentSrc;
                let index = this.overImageList.findIndex(item => decodeURI(item[0]) == decodeURI(str));
                this.imagesArr[index] = imgs;
                if (index == this.curDeg) {
                    this.drawImg(null);
                }
            }
            this.running--;
            if (this.list.length > 0) {
                this.launch();
            }
            else if (this.running == 0) {
            }
        });
    }
    initImage(item) {
        return item.map(el => {
            let p = () => {
                return new Promise((resolve, reject) => {
                    let img = new Image();
                    img.src = el;
                    img.onload = () => {
                        resolve(img);
                    };
                    img.onerror = (err) => {
                        reject(err);
                    };
                });
            };
            return p;
        });
    }
    launch() {
        while (this.running < this.maxThread && this.list.length > 0) {
            let item = this.list.shift() ?? [];
            this.addDownloadTask(item);
        }
    }
    addDownloadTask(item) {
        let arr = this.initImage(item);
        this.launchImage(arr);
        this.running++;
    }
}