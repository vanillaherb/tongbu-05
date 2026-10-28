# 《万物的原理》05 · 同步·不约而同 —— 源码

这个文件夹就是整期视频的全部源码：画面是代码实时算出来的物理模拟（Chromium 里的 Canvas 逐帧渲染），配乐是用你下载的 4 首 Pixabay 曲子按画面剪出来的，字幕和合成用 ffmpeg 完成。在你自己电脑上跑一遍，就能得到和我发给你的成片一模一样的结果。

---

## 〇、在 GitHub 上出片（不用装任何东西）

这个仓库自带一条 GitHub Actions 流程（`.github/workflows/render.yml`）：把整片按场景切成 7 块，7 台机器同时渲染，再拼起来、配乐、烧字幕、生成封面，最后发到仓库的 **Releases** 页面。

- **手动出片**：仓库页面 → **Actions** → 左侧「渲染成片」→ 右上 **Run workflow** → 绿色按钮。
- **自动出片**：改了 `script.json`（文案）、`render/`（画面）、`mix.py`（配乐）等文件并推到 `main`，会自动重渲。
- **下载**：大约 15～20 分钟后，在仓库首页右侧 **Releases** 里下载成片、无字幕版、字幕和封面。
- 进度和报错在 Actions 页面里能看到，每块单独一行。

注意：仓库必须保持 **私有**（`music/` 里是 Pixabay 配乐原文件，公开等于转发音频）。私有仓库每月有 2000 分钟免费 Actions 额度，出一次片大约用掉 90～100 分钟。

---

## 一、装一次环境（想在自己电脑上渲染才需要）（大约 10 分钟）

| 软件 | 版本 | 怎么装 |
|---|---|---|
| Node.js | 18 或更新 | https://nodejs.org 下载 LTS 版 |
| Python | 3.10 或更新 | https://www.python.org （Windows 安装时勾选 *Add to PATH*） |
| ffmpeg | 需要带 libass（烧字幕）和 rubberband（高音质变速） | **Windows**：https://www.gyan.dev/ffmpeg/builds/ 下载 *full* 版，解压后把 `bin` 加到 PATH<br>**macOS**：`brew install ffmpeg` |

装好后，在本文件夹打开终端（Windows 用 PowerShell），运行：

```bash
npm install
npx playwright install chromium
pip install -r requirements.txt
```

字体不用装：思源宋体/黑体（Noto CJK SC）、DejaVu Sans Mono、Liberation Serif 已经放在 `fonts/` 里，渲染和烧字幕都直接用这些文件，换电脑效果不变。

## 二、准备配乐（一次）

把那 9 首 MP3 所在的文件夹路径填进去：

```bash
python prep_music.py music
```
（仓库里的 `music/` 文件夹已经放好了需要的 4 首；用源码包的话，填那 9 首 MP3 所在的文件夹。）

它会把 01、03、06、09 四首变速到 114 BPM（只变速不变调），存到 `mus/`。
音乐文件没有放在源码包里：Pixabay 的授权允许用在你的视频里，但不允许把音频文件单独转发。

## 三、一键出片

```bash
python build.py --720 --covers
```

依次做：生成时间轴 → 渲染画面（最慢，约 10~30 分钟，看 CPU）→ 剪配乐和音效 → 生成字幕 → 合成。
成品都在 `build/`：

| 文件 | 说明 |
|---|---|
| `同步_成片.mp4` | 1080P，带中英字幕和配乐 |
| `同步_无字幕版.mp4` | 1080P，无字幕（录本人旁白时用） |
| `同步_成片_720P.mp4` / `同步_无字幕版_720P.mp4` | 加了 `--720` 才有 |
| `同步_字幕.srt` | 字幕文件 |
| `封面/` | B站 16:9、抖音 3:4 / 4:3（加了 `--covers` 才有） |

画面渲染过一次以后，只改了字幕样式或配乐，用 `python build.py --skip-render` 几分钟就能重新出片。

## 四、改东西

**改字幕文字**：编辑 `script.json`，每一句是 `zh`（中文）和 `en`（英文）。时间轴会按字数自动重排，并吸附到 114 BPM 的拍点上；画面、配乐、音效都读同一份时间轴，会跟着走。
改动很大时（比如某段多出好几句），段落会整体后移，配乐剪辑点也会跟着后移；建议改完先看一遍再发。

**只看几帧（不用等整片）**：

```bash
node render/drive.js preview 28.5,105,199          # 截图在 render/prev/
```

想快速看后面的片段，可以让它从某一秒开始模拟：

```bash
# macOS / Linux
START=98 node render/drive.js preview 100,105
# Windows PowerShell
$env:START=98; node render/drive.js preview 100,105; Remove-Item Env:START
```

**常用位置**：

| 想改 | 文件 |
|---|---|
| 每一段的画面 | `render/s_hook.js`（开场节拍器、江离片头、标题卡）、`render/s_rest.js`（其余各段） |
| 辉光、拖影、震屏、转场、背景 | `render/main.js`、`render/engine.js` |
| 节拍速度（114 BPM） | `render/engine.js` 里的 `BPM`，以及 `timeline.py`、`mix.py` 里的同名常量（三处要一起改，并重新准备配乐） |
| 配乐怎么剪、音效、声音标识 | `mix.py` |
| 字幕字体字号 | `make_ass.py` |
| 封面 | `cover/make_covers.py`，放大镜图标在 `cover/icon.py`（按头像实测比例） |

## 五、文件结构

```
build.py            一键出片
prep_music.py       配乐变速到 114 BPM
join_parts.py       把分块渲染的画面拼回整片（GitHub 上用）
.github/workflows/  GitHub 上的出片流程
music/              4 首 Pixabay 原曲（仅私有仓库）
script.json         全片文案（中英）
timeline.py         按字数排时间轴、吸附拍点 → timeline.json + SRT
render/             画面渲染器（Chromium + Canvas，逐帧确定性渲染）
  drive.js            控制渲染、输出 mp4、记录画面事件（events.json，配乐卡点用）
  engine.js           3D 镜头、辉光、文字、HUD 等基础
  main.js             分层合成、转场、全局特效
  s_hook.js           开场、江离片头、标题卡
  s_rest.js           惠更斯 / 掌声 / 仓本 / 生物钟 / 千禧桥 / 电网 / 癫痫 / 结尾 / 片尾
mix.py              剪配乐 + 节拍器/钟声/掌声/脚步音效 + 声音标识 + 混音
make_ass.py         生成 ASS 字幕（思源黑体）
cover/              封面生成（模板 + 头像同款放大镜）
fonts/              打包的开源字体及授权文件
mus/                prep_music.py 生成的配乐（自己准备）
build/              所有输出
```

## 六、常见问题

- **`fonts loaded: 0` 或字体不对**：确认 `fonts/` 没有被挪走；渲染器会以 `--allow-file-access-from-files` 启动 Chromium 来读取这些字体。
- **ffmpeg 报 `No such filter: 'ass'`**：说明装的 ffmpeg 不带 libass，换 gyan.dev 的 full 版。
- **prep_music 提示用了 atempo**：ffmpeg 没带 rubberband，也能用，只是变速音质略差。
- **渲染很慢**：渲染是单线程逐帧画的，主要吃 CPU 单核性能；中途可以用 preview 先确认效果。

字体授权：Noto CJK（思源同源字形）为 SIL Open Font License 1.1；DejaVu 为 Bitstream Vera 授权；Liberation 为 SIL OFL 1.1。授权原文在 `fonts/licenses/`。
