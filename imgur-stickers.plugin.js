/**
 * @name BDImgurStickers
 * @author Jason Liang
 * @description Send images from an imgur album
 * @version 0.0.7
 * @source https://github.com/jasonliang-dev/bd-imgur-stickers
 */

/*
This software is available under 2 licenses. Choose whichever you prefer.

------------------------------------------------------------------------------

ALTERNATIVE A - MIT License

Copyright (c) 2020 Jason Liang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

------------------------------------------------------------------------------

ALTERNATIVE B - The Unlicense

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
*/

/* global BdApi */

class BDImgurStickers {
  start() {
    const IMGUR_CLIENT_ID = "2be59afdb459916";
    const STORAGE_ALBUM_ID = "liang-imgur-stickers-album-id";

    const iframe = document.createElement("iframe");
    iframe.id = BDImgurStickers.storeId;
    const store =
      document.head.appendChild(iframe).contentWindow.frames.localStorage;

    BdApi.injectCSS(
      BDImgurStickers.cssId,
      `
      .l-opacity-75 {
        opacity: 0.75;
      }

      .h\\:l-opacity-100:hover {
        opacity: 1;
      }

      .l-interactive-normal {
        color: var(--interactive-normal);
      }

      .h\\:l-interactive-active:hover {
        color: var(--interactive-active);
      }
      `
    );

    const { React } = BdApi;
    const e = React.createElement;

    function App() {
      const savedAlbumID = store.getItem(STORAGE_ALBUM_ID) || "";

      const buttonEl = React.useRef(null);
      const menuEl = React.useRef(null);
      const inputDebounce = React.useRef(null);
      const [albumID, setAlbumID] = React.useState(savedAlbumID);
      const [albumIDDebounced, setAlbumIDDebounced] =
        React.useState(savedAlbumID);
      const [menuOpen, setMenuOpen] = React.useState(false);
      const [menuPlacement, setMenuPlacement] = React.useState({ x: 0, y: 0 });
      const [buttonPlacement, setButtonPlacement] = React.useState({
        x: 0,
        y: 0,
      });
      const [imageLinks, setImageLinks] = React.useState({ err: null, ok: [] });

      React.useEffect(() => {
        store.setItem(STORAGE_ALBUM_ID, albumIDDebounced);

        fetch(`https://api.imgur.com/3/album/${albumIDDebounced}`, {
          method: "GET",
          headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              return json.data.images.map((i) => i.link);
            }
            throw new Error(json);
          })
          .then((links) => setImageLinks({ err: null, ok: links }))
          .catch((err) => {
            setImageLinks({ err, ok: null });
            console.error(err);
          });
      }, [albumIDDebounced]);

      React.useEffect(() => {
        const topbar = document.querySelector("html.platform-win");
        const windowsYOffset = topbar ? -21 : 0;

        let request;

        function stayInPlace() {
          const textarea = document.querySelector("[class^=channelTextArea]");

          if (textarea) {
            const menuRect = textarea.getBoundingClientRect();
            setMenuPlacement({
              x: menuRect.right,
              y: menuRect.top + windowsYOffset,
            });
          }

          const textareaButtons = document.querySelector(
            "[class^=channelTextArea] [class^=buttons]"
          );

          if (textareaButtons) {
            const buttonRect = textareaButtons.getBoundingClientRect();
            setButtonPlacement({
              x: buttonRect.left,
              y: buttonRect.top + windowsYOffset,
            });
          }

          request = window.requestAnimationFrame(stayInPlace);
        }

        request = window.requestAnimationFrame(stayInPlace);

        return () => {
          window.cancelAnimationFrame(request);
        };
      }, []);

      React.useEffect(() => {
        function closeMenuOnOutsideClick(event) {
          if (buttonEl.current === null || menuEl.current === null) {
            return;
          }

          if (
            !buttonEl.current.contains(event.target) &&
            !menuEl.current.contains(event.target)
          ) {
            setMenuOpen(false);
          }
        }

        document.addEventListener("click", closeMenuOnOutsideClick);

        return () => {
          document.removeEventListener("click", closeMenuOnOutsideClick);
        };
      }, []);

      React.useEffect(() => {
        function closeMenuOnEsc(event) {
          if (event.key === "Esc" || event.key === "Escape") {
            setMenuOpen(false);
          }
        }

        document.addEventListener("keydown", closeMenuOnEsc);

        return () => {
          document.removeEventListener("keydown", closeMenuOnEsc);
        };
      }, []);

      const messageUpload = BdApi.findModuleByProps(
        "upload",
        "instantBatchUpload"
      ).upload;

      const getBlobFromLink = async (link) => {
        const response = await fetch(link, { cache: "force-cache" });
        const fileBuffer = await response.arrayBuffer();
        const filename = "sticker.png";
        const file = new File([Buffer.from(fileBuffer)], filename);
        return file;
      };

      const sendMessage = ({ channelId, file, messageContent }) => {
        console.log({ messageUpload });
        messageUpload({
          channelId,
          file,
          message: {
            content: messageContent,
          },
        });
      };

      const sendImage = async (link) => {
        const channel = window.location.href.split("/").slice(-1)[0];
        const file = await getBlobFromLink(link);
        console.log({ channel, link, file });
        sendMessage({
          channelId: channel,
          messageContent: "",
          file,
        });
      };

      return e("div", { style: { position: "absolute", zIndex: 50 } }, [
        e(
          "button",
          {
            ref: buttonEl,
            type: "button",
            onClick: () => setMenuOpen((prev) => !prev),
            style: {
              left: buttonPlacement.x - 105,
              top: buttonPlacement.y,
              height: 44, // the normal height of textarea
              display: "flex",
              alignItems: "center",
              position: "absolute",
              backgroundColor: "transparent",
              transition: "color 150ms",
            },
            className: "l-interactive-normal h:l-interactive-active",
          },
          e(
            "svg",
            {
              xmlns: "http://www.w3.org/2000/svg",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              style: {
                width: 24,
                height: 24,
              },
            },
            e(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
              },
              null
            )
          )
        ),
        e(
          "div",
          {
            ref: menuEl,
            style: (() => {
              const w = 500;
              const h = 500;
              const margin = 8;
              const pad = 8;
              // the menu placement (relative to textarea) is off by 71px to the
              // right. idk why. just hardcode it because I spent too much time
              // pulling my hair trying to find out why.
              const weirdMagicOffset = 71;

              return {
                display: menuOpen ? "block" : "none",
                position: "absolute",
                overflowY: "auto",
                left: menuPlacement.x - w - margin - pad * 2 - weirdMagicOffset,
                top: menuPlacement.y - h - margin - pad * 2,
                width: w,
                height: h,
                backgroundColor: "var(--background-secondary)",
                borderRadius: 8,
                boxShadow: "var(--elevation-stroke), var(--elevation-high)",
                padding: pad,
              };
            })(),
          },
          [
            e(
              "div",
              { style: { display: "flex", paddingBottom: 8 } },
              e(
                "input",
                {
                  type: "text",
                  value: albumID,
                  onChange: (event) => {
                    if (inputDebounce.current !== null) {
                      clearTimeout(inputDebounce.current);
                    }

                    const { value } = event.target;

                    inputDebounce.current = setTimeout(() => {
                      setAlbumIDDebounced(value);
                    }, 1000);

                    setAlbumID(value);
                    setImageLinks({ err: null, ok: [] });
                  },
                  placeholder: "Imgur album ID",
                  style: {
                    borderWidth: 0,
                    borderRadius: 4,
                    backgroundColor: "var(--background-tertiary)",
                    color: "var(--text-normal)",
                    width: "100%",
                    padding: "8px 12px",
                  },
                },
                null
              )
            ),
            (() => {
              if (imageLinks.err) {
                return e(
                  "div",
                  { style: { display: "flex", justifyContent: "center" } },
                  e(
                    "p",
                    {
                      style: {
                        color: "var(--text-normal)",
                        textAlign: "center",
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        paddingTop: 200,
                        width: 300,
                      },
                    },
                    "There was an error fetching images. Is the album ID correct?"
                  )
                );
              }

              return e(
                "ul",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 16,
                  },
                },
                imageLinks.ok.map((link) =>
                  e(
                    "li",
                    {
                      key: link,
                      style: { display: "flex", justifyContent: "center" },
                    },
                    e(
                      "button",
                      {
                        type: "button",
                        onClick: () => sendImage(link),
                        style: {
                          backgroundColor: "transparent",
                          transition: "opacity 150ms",
                        },
                        className: "l-opacity-75 h:l-opacity-100",
                      },
                      e(
                        "img",
                        {
                          src: link,
                          style: {
                            width: "100%",
                            height: 80,
                            objectFit: "contain",
                          },
                        },
                        null
                      )
                    )
                  )
                )
              );
            })(),
          ]
        ),
      ]);
    }

    function mount() {
      console.log("[stickers] > mount()");

      if (document.querySelector(BDImgurStickers.domId)) {
        console.log("[stickers] > already mounted. aborting", "warn");
        return;
      }

      const target = document.querySelector(BDImgurStickers.mountTarget);

      if (!target) {
        setTimeout(mount, 500);
        return;
      }

      console.log("[stickers] > mounting app");
      const applicationContainer = document.createElement("div");
      applicationContainer.id = BDImgurStickers.domId;
      target.prepend(applicationContainer);
      BdApi.ReactDOM.render(e(App, {}, null), applicationContainer);
    }

    mount();
  }

  stop() {
    BdApi.clearCSS(BDImgurStickers.cssId);

    document.head.removeChild(
      document.querySelector(`#${BDImgurStickers.storeId}`)
    );

    BdApi.ReactDOM.unmountComponentAtNode(
      document.querySelector(
        `${BDImgurStickers.mountTarget} #${BDImgurStickers.domId}`
      )
    );
  }
}

BDImgurStickers.mountTarget =
  "[class*=baseLayer] > [class*=container] > [class*=base]";
BDImgurStickers.domId = "liang-imgur-stickers-app";
BDImgurStickers.cssId = "liang-imgur-stickers-css";
BDImgurStickers.storeId = "liang-imgur-stickers-iframe";

module.exports = BDImgurStickers;
