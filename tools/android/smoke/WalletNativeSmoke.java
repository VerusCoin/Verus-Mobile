import java.io.File;
import java.lang.reflect.Method;
import android.system.Os;
import android.system.OsConstants;

public class WalletNativeSmoke {
  private static Class<?> backend;
  private static Object call(String name, Class<?>[] types, Object... args) throws Exception {
    Method method = backend.getDeclaredMethod(name, types);
    method.setAccessible(true);
    return method.invoke(null, args);
  }
  public static void main(String[] args) throws Exception {
    long pageSize = Os.sysconf(OsConstants._SC_PAGESIZE);
    if (pageSize != 16384) throw new AssertionError("Expected 16 KB pages, got " + pageSize);
    System.load(args[0]);
    backend = Class.forName("cash.z.ecc.android.sdk.internal.jni.RustBackend");
    call("initOnLoad", new Class<?>[0]);
    File root = new File(args[1]);
    if (!root.mkdirs() && !root.isDirectory()) throw new AssertionError("Cannot create test directory");
    int metadata = (Integer) call("initBlockMetaDb", new Class<?>[]{String.class}, root.getPath());
    if (metadata != 0) throw new AssertionError("Metadata database initialization: " + metadata);
    byte[] seed = new byte[32];
    for (int index = 0; index < seed.length; index++) seed[index] = (byte) index;
    String dbPath = new File(root, "wallet.sqlite3").getPath();
    Class<?>[] signature = {String.class, byte[].class, byte[].class, byte[].class, int.class};
    int database = (Integer) call("initDataDb", signature, dbPath, null, null, seed, 0);
    if (database != 0) throw new AssertionError("Wallet database initialization: " + database);
    int reopened = (Integer) call("initDataDb", signature, dbPath, null, null, seed, 0);
    if (reopened != 0) throw new AssertionError("Wallet database reopen: " + reopened);
    if (new File(dbPath).length() == 0) throw new AssertionError("Missing database file");
    System.out.println("PASS: 16 KB device loaded packaged Rust backend, initialized native runtime, created metadata/wallet SQLite databases and reopened wallet database.");
  }
}
