/* PKT-0108: LD_PRELOAD shim that passes V8 flags to the installed x2t without rebuilding core.
 * A constructor runs after libdoctrenderer.so is loaded (it is a DT_NEEDED of x2t) and before main, so the
 * flags are set before V8::Initialize. Flags come from env X2T_V8_FLAGS.
 * Build: cc -shared -fPIC -o x2t-v8flags-shim.so x2t-v8flags-shim.c -ldl */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdlib.h>
#include <stdio.h>
__attribute__((constructor)) static void set_flags(void) {
  const char *f = getenv("X2T_V8_FLAGS"); if (!f || !*f) return;
  void (*sf)(const char *) = (void (*)(const char *))dlsym(RTLD_DEFAULT, "_ZN2v82V818SetFlagsFromStringEPKc");
  if (!sf) { fprintf(stderr, "x2t-v8flags-shim: SetFlagsFromString not found\n"); return; }
  sf(f);
}
