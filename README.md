# How to access pods in the same OKE cluster subnet without using LB (or other service) just by using OCI Native networking

OCI Networking is very strong and today you can create OCI Kubernetes (OKE) cluster
using OCI native VCN. That makes pods inter-communication simple just by using
the OKE native VCN assigned IP's for the REST calls between pods.

Let's look at this example.

## Create OCI VCN

Using Cloud UI Networking and the VCN Wizard to create a VCN with Internet access. 
After VCN is created add a rule to the <code>private subnet security list</code> to <code>allow traffic from all ports and addresses</code>. (We can use this rule while our testing, in real life this would be likely considered being too open.)

## Create OKE cluster using the OCI native VCN

Using Cloud UI create a new OKE cluster with the <code>Custom create</code> option and use the following setting for the cluster creation:

- <b>VCN native</b> pod networking
- Select the VCN created previously
- Use the VCN Public Subnet for LB (even we are not using this)
- Use the VCN Public Subnet for Kubernetes API Endpoint (for the kubectl command line utility)
- Node Pool type <b>Virtual</b> (can also use Managed if preferred)
- Node count 1
- Use the VCN Private Subnet for Pod communication
- Use the VCN Private Subnet for Virtual Node communication

After cluster creating click <code>Edit button</code> and Assign Public API endpoint by checking this option and then Save. Then wait for the cluster to enable this.
    
## Build containers and push them to registry (OCIR)

Using Cloud UI Containers create two <code>public</code> repositories for the container images in the desired <code>compartment</code>:
- <code>cars-api</code>
- <code>cars-client</code>

<p>
Open <code>Cloud Shell</code> and clone this github repo to pull the containers source code:
<pre>
git clone https://github.com/mikarinneoracle/pods-communication-easy-with-OCI-VCN-native-Kubernetes.git
</pre>

<p>
Then build containers:
<pre>
cd server
docker build .
</pre>
Tag the created <code>cars-api</code> container image to match <a href="https://github.com/mikarinneoracle/pods-communication-easy-with-OCI-VCN-native-Kubernetes/blob/main/server/oke.yaml#L19">the line 19</a> in server OKE.yaml
</pre>
<p>
Do the same for the client:
<pre>
cd ../client
docker build .
</pre>
And tag <code>cars-client</code> container image to match <a href="https://github.com/mikarinneoracle/pods-communication-easy-with-OCI-VCN-native-Kubernetes/blob/main/client/oke.yaml#LL19C16-L19C54">the line 19</a> in client OKE.yaml

<br>
<br>
After building login to OCIR using <code>docker login</code> and push containers to the repositories:
<pre>
docker push &lt;REGION&gt;.ocir.io/&lt;TENANCY NAMESPACE&gt;/cars-api:1
docker push &lt;REGION&gt;.ocir.io/&lt;TENANCY NAMESPACE&gt;/cars-client:1
</pre>

## Access OKE cluster and deploy containers for testing

In Cloud Shell create the OKE cluster API endpoint access by using the <code>oci cli command</code> first by clicking the <code>Access Cluster button</code> and then copying the access using public endpoint option and pasting it to Cloud Shell e.g.

<pre>
oci ce cluster create-kubeconfig --cluster-id ocid1.cluster.oc1.eu-amsterdam-1.aaaaaaaa....bmitm47a --file $HOME/.kube/config --region eu-amsterdam-1 --token-version 2.0.0  --kube-endpoint PUBLIC_ENDPOINT
</pre>

Test access by doing <code>kubectl get nodes</code> that should return like:
<pre>
NAME         STATUS   ROLES    AGE   VERSION
10.0.1.132   Ready    &lt;none&gt;   1m    v1.26.2-0.2.169-230516185737
</pre>

## Deploy you containers to OKE

First deploy the <code>cars-api</code> container in Cloud Shell:
<pre>
cd ../server
kubectl create -f oke.yaml
</pre>

Get the IP address of the created pod by doing:
<pre>
kubectl get pods -o wide
</pre>
That should return like:
<pre>
NAME                                  READY   STATUS    RESTARTS   AGE   IP          NODE         NOMINATED NODE   READINESS GATES
cars-api-deployment-ff4d7f67f-zv99w   1/1     Running   0          94s   10.0.1.10   10.0.1.158   <none>           &lt;none&gt;
</pre>
<p>
Copy the <code>IP</code> from the output and replace the &lt;IP&gt; with it on <a href="https://github.com/mikarinneoracle/pods-communication-easy-with-OCI-VCN-native-Kubernetes/blob/main/client/oke.yaml#L23">line 23</a> using Cloud Shell Code Editor or nano shell editor and then deploy the <code>cars-client</code> container (in this case the IP equals to <b>10.0.1.10</b>):
<pre>
cd ../client
nano oke.yaml
kubectl create -f oke.yaml
</pre>

See the pods status by doing <code>kubectl get pods</code> that should return like:
<pre>
NAME                                      READY   STATUS      RESTARTS   AGE
cars-api-deployment-ff4d7f67f-zv99w       1/1     Running     0          10m
cars-client-deployment-75d7c6ff8f-6pbbn   0/1     Completed   3          2m3s
</pre>

See the log for the <code>cars-client</code> container to see if the inter-pod call was succesful:
<pre>
kubectl logs cars-client-deployment-75d7c6ff8f-6pbbn 
2023-05-29T12:44:21.684181211Z stderr F   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
2023-05-29T12:44:21.684207631Z stderr F                                  Dload  Upload   Total   Spent    Left  Speed
100    87  100    87    0     0   6528      0 --:--:-- --:--:-- --:--:--  6692
2023-05-29T12:44:21.707228175Z stdout P <b>{"cars":[{"id":"1","name":"Toyota"},{"id":"2","name":"BMW"},{"id":"3","name":"Volvo"}]}</b>
</pre>
In the command above replace the pod name <code>cars-client-deployment-75d7c6ff8f-6pbbn </code> with actual one.
<p>
Please note that since the client container exists after the <a href="https://github.com/mikarinneoracle/pods-communication-easy-with-OCI-VCN-native-Kubernetes/blob/main/client/Dockerfile#L5">curl command</a> it will keep on restarting until the pod is killed when using node pool type <b>Virtual</b>. (This won't happen using managed nodes.)

## Finally

Delete deployments:
<pre>
kubectl delete deployment cars-client-deployment  
kubectl delete deployment cars-api-deployment  
</pre>

And then delete the OKE cluster and the VCN created for this example.