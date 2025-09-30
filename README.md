# ink-screen-bluetooth

## 2025-09-30 更新，goldTrending.js 单体文件
调用方式：在任何一个 Linux 或者 Windows 或者MacOS等系统上，配置定时器调用即可

以 Ubuntu 为例，使用 Crontab 配置：
```
# m h  dom mon dow   command
0 9-17/1 * * 1-5 node /path/to/goldTrending.js
```
需要 NodeJS 18 及以上，记得安装 npm 依赖！


## app.js 为服务端程序版本，会保持在线
当前的脚本仅能控制特殊型号的产品（具体型号见文章截图），并不是通用的蓝牙墨水屏控制程序哦


希望大家都能爱上这种Hack产品的喜悦感


具体过程参考我的[博客说明](https://gadore.top/archives/1677915050714)


如何使用该脚本？



随便找一个带低功耗蓝牙的设备（例如树莓派）



An script that can control a inkScreen with bluetooth protocol

This program only suits specified products which's mentioned in my blog, but the hack process is a general method

Hope you guys will like this hacking feeling too

For more detail of this hacking process, plz see my blog ^_^. [Blog](https://gadore.top/archives/1677915050714)

How to use this project ?

Find a device with low BLE, such as respberryPi

````
git clone https://github.com/gadore/ink-screen-bluetooth.git
cd ink-screen-bluetooth
yarn
node app.js
````

*Happy hacking ~*

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=gadore/ink-screen-bluetooth&type=Date)](https://star-history.com/#gadore/ink-screen-bluetooth&Date)
