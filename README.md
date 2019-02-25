# Verus Mobile 
The iOS/Android Verus Mobile multi-coin Wallet

Welcome to the Verus Mobile multi-currency crypto wallet test release! This mobile wallet will be the core code base going forward for the Verus mobile experience, including PBaaS and crypto application support in the future. The features currently included are: 

•Multiple account support, the ability to use different keys on the same phone

•VerusPay QR scanner integration, allowing users to go from scanning a Verus QR code to being prompted with a transaction to confirm in one step

•Support for 11 different coins, with more to come soon

•The ability to create VerusPay invoices compatible with the Verus Mobile app

Feel free to report any discovered bugs, issues, or suggestions by either publicly asking for community support on one of our mobile channels at https://discord.gg/VRKMP2S, or, for more discretion, emailing development@veruscoin.io.

# Privacy Statement
No personal data is stored or collected by the Verus Mobile application, except as necessary for authentication. All authentication data is stored locally.

The Verus Mobile application uses the following permissions for the following reasons:

•Internet connectivity: In order to fetch and post data and communicate with the blockchain through Electrum servers, the app requires internet connectivity. The signing of transactions is done locally and private keys are not shared over any network.

•Access to system alerts: In order to notify the user of important ongoing events while using the Verus Mobile application, the Verus Mobile application uses the system alert framework on both iOS and Android.

•Camera and Audio access: The Verus Mobile application's VerusPay QR code scanner is designed to read and parse VerusQR codes, or VerusPay invoices through the camera, and requires camera access to work properly. The user will be prompted to allow camera access upon first opening the VerusPay feature. Due to the current constraints of the library being used for VerusPay, the user will be asked to enable audio by default when starting VerusPay for the first time. Choosing to disable audio should in no way affect VerusPay's functionality. 

•Permission to vibrate the mobile device: The Verus Mobile application uses the vibration feature of the mobile device it is running on for VerusPay, in order to give feedback upon the scan of a QR code invoice.

# Disclaimer

THIS IS EXPERIMENTAL SOFTWARE AND IT IS PROVIDED "AS IS" AND ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
