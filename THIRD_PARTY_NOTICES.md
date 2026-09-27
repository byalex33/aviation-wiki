# OpenSourceUI

The homepage search field, search button depth effects, and featured article
placards adapt the following components from [OpenSourceUI](https://opensourceui.in/):

- [SearchInput](https://github.com/bidyut10/opensourceui/blob/main/components/inputs/search-input.tsx)
- [DepthOutlineButton](https://github.com/bidyut10/opensourceui/blob/main/components/buttons/depth-outline-button.tsx)
- [MuseumPlacardCard](https://github.com/bidyut10/opensourceui/blob/main/components/gallery/museum-placard-card.tsx)
- [AnnotatedText](https://github.com/bidyut10/opensourceui/blob/main/components/underlines/annotated-text.tsx) — arrow underline on the homepage headline, with unique filter IDs and inherited typography.
- [SystemAlertBanner](https://github.com/bidyut10/opensourceui/blob/main/components/notifications/system-alert-banner.tsx) — signup-only open-source welcome, displayed through Sonner with a GitHub link and an account-level shown flag.

The adaptations use aviation.wiki theme tokens, native search controls, and
article navigation in place of the original card's flip interaction.

MIT License

Copyright (c) 2026 Bidyut Kundu

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

# beUI

The homepage headline and category entrances adapt the spring reveal from
[TextReveal](https://beui.dev/components/motion/text-animation). The search button
adapts the press feedback from [Button](https://beui.dev/components/motion/button).
Dropdowns adapt the unfolding panel and item reveals from
[Select](https://beui.dev/components/motion/select), with Base UI handling select
and menu interactions. The Markdown help dialog adapts the center unfolding
surface from [Center Morph Modal](https://beui.dev/components/motion/center-morph-modal).
These components are from [beUI](https://github.com/starc007/ui-components).

The adaptations preserve visible server-rendered content, animate entrances once,
and skip animation when reduced motion is requested.

MIT License

Copyright (c) 2026 Saurabh Chauhan

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

# ui lab by xevrion

The account fields adapt [PasswordField](https://github.com/xevrion/ui-lab/blob/main/src/lab/components/password-field.tsx)
and [FloatingLabel](https://github.com/xevrion/ui-lab/blob/main/src/lab/components/floating-label.tsx)
from [xevrion/ui-lab](https://github.com/xevrion/ui-lab). Adapted files are
`src/components/auth/auth-field.tsx`, `password-reveal.tsx`, `password-advice.tsx`,
`auth.module.css`, and the password strength helper in `src/lib/auth-ui.ts`.
The adaptations use controlled values for Clerk, keep native input editing and
autofill, and follow the site's square field and reduced-motion styling.

MIT License

Copyright (c) 2026 Yash Bavadiya

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
